import threading
import json
import time
import os
import copy
import math
import logging
import requests

from flask import Flask, jsonify, request, render_template
from sseclient import SSEClient

NINBOT_BASE_URL = 'http://localhost:52533'
STRONGHOLD_SSE_URL = f'{NINBOT_BASE_URL}/api/v1/stronghold/events' 
BLIND_SSE_URL = f'{NINBOT_BASE_URL}/api/v1/blind/events'
BOAT_SSE_URL = f'{NINBOT_BASE_URL}/api/v1/boat/events'
DIVINE_SSE_URL = f'{NINBOT_BASE_URL}/api/v1/divine/events'

PORT = 31621

class DataFetcher:
    def __init__(self):
        self.data = {}
        self.error = None
        
        self.sse_urls = [
            (STRONGHOLD_SSE_URL, "stronghold"),
            (BOAT_SSE_URL, "boat"),
            (BLIND_SSE_URL, "blind"),
            (DIVINE_SSE_URL, "divine")
        ]
        
        self.threads = [
            threading.Thread(target=lambda url=url, key=key: self._sse_worker(url, key), daemon=True)
            for url, key in self.sse_urls
        ]
        
        self.threads.append(threading.Thread(target=self.fetch_version, daemon=True))

    def start(self):
        for thread in self.threads:
            thread.start()

    def _sse_worker(self, url, data_name):
        while True:
            try:
                client = SSEClient(url)
                self.error = None
                
                for msg in client:
                    if msg.event == 'message':
                        self.data[data_name] = json.loads(msg.data)
                
            except Exception as e:
                self.error = e.__str__()
                time.sleep(5) # wait 5s before rc

    def fetch_version(self):
        res = requests.get(f'{NINBOT_BASE_URL}/api/v1/version')
        if res.status_code == 200:
            self.data['version'] = res.json()['version']
    
    def get_data(self):
        return self.data

def run_flask():
    app.run(host='0.0.0.0', port=PORT, debug=False)

def load_options():
    global server_options
    if not os.path.exists(f'{os.getcwd()}\\config.json'):
        with open(f'{os.getcwd()}\\config.json','w+') as f:
            return json.dump(server_options, f)
        
    with open(f'{os.getcwd()}\\config.json','r') as f:
        server_options = json.load(f)

def radians_to_degrees(radians):
    return '{:.1f}'.format(round(radians * (180 / math.pi), 1))

def get_predictions(data):
    predictions = []
    
    for pred in data['predictions']:
        chunkX = pred['chunkX']
        chunkZ = pred['chunkZ']

        player_position = data.get('playerPosition', {})
        current_position = (
            player_position.get('xInOverworld', None),
            player_position.get('zInOverworld', None)
        )
        target_position = ((chunkX * 16) + 4, (chunkZ * 16) + 4)
        current_angle = player_position.get('horizontalAngle', None)
        
        distance = pred['overworldDistance']
        if player_position.get('isInNether'):
            distance /= 8
        
        predictions.append({
            "certainty": pred['certainty'],
            "x": chunkX if server_options['use_chunk_coords'] else (chunkX * 16 + 4),
            "z": chunkZ if server_options['use_chunk_coords'] else (chunkZ * 16 + 4),
            "netherX": chunkX * 2,
            "netherZ": chunkZ * 2,
            "distance": distance,         
            "angle": (
                '{:.2f}'.format(round(get_direction(current_position, target_position), 2))
                if server_options.get('show_angle') 
                and None not in current_position
                else None
            ),
            "direction": (
                '{:.2f}'.format(round(get_direction(current_position, target_position, current_angle), 2))
                if server_options.get('show_angle')
                and None not in current_position
                and current_angle is not None
                else None
            )
        })
    return predictions

def get_blindresult(player_data):
    api_evaluations = {
        'EXCELLENT': 'excellent',
        'HIGHROLL_GOOD': 'good for highroll',
        'HIGHROLL_OKAY': 'okay for highroll',
        'BAD_BUT_IN_RING': 'bad, but in ring',
        'BAD': 'bad',
        'NOT_IN_RING': 'not in any ring'
    }

    evaluation = player_data.get('evaluation')
    if evaluation in api_evaluations:
        player_data['evaluation'] = api_evaluations[evaluation]

    player_data['highrollProbability'] = f"{player_data.get('highrollProbability', 0) * 100:.1f}%"
    return player_data

def get_player_data(data, type):    
    if type == 'stronghold':     
        player_data = data.get('predictions', {})

        data['predictions'] = get_predictions(data)
        return data
    elif type == 'blind':      
        player_data = data.get('blindResult', {})
        
        player_data['xInNether'] = round(player_data.get('xInNether', 0))
        player_data['zInNether'] = round(player_data.get('zInNether', 0))
        player_data['improveDirection'] = radians_to_degrees(player_data.get('improveDirection', 0))
        player_data['improveDistance'] = round(player_data.get('improveDistance', 0))

        data['blindResult'] = get_blindresult(player_data)
        return data
    elif type == 'divine':
        return data

def get_direction(current_position, target_position, current_angle=None):
    x1, z1 = current_position
    x2, z2 = target_position

    delta_x = x2 - x1
    delta_z = z2 - z1

    target_angle_rad = math.atan2(delta_z, delta_x)
    target_angle_deg = math.degrees(target_angle_rad)

    target_angle_deg = (target_angle_deg + 270) % 360

    if current_angle is None:
        if target_angle_deg > 180:
            target_angle_deg -= 360
        return target_angle_deg

    current_angle = current_angle % 360
    direction = target_angle_deg - current_angle

    direction = (direction + 180) % 360 - 180

    return direction

app = Flask(__name__)

app.logger.setLevel(logging.WARNING)

werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.WARNING)

sse_fetcher = DataFetcher()
sse_fetcher.start()

server_options = {
    'use_chunk_coords': True,
    'show_angle': True
}

load_options()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_options', methods=['GET'])
def get_options():
    return jsonify(server_options), 200

@app.route('/update_option', methods=['POST'])
def update_option():
    data = request.json
    option = data.get('option')
    value = data.get('value')

    if option in server_options:
        server_options[option] = value
        with open(f'{os.getcwd()}\\config.json','w+') as f:
            json.dump(server_options, f)
        
        return jsonify({"message": f"{option} updated"}), 200
    
    return jsonify({"error":"Invalid option"}), 400

@app.route('/get_data')
def get_data():
    if sse_fetcher.error:
        return jsonify({'error': sse_fetcher.error}), 500

    data = copy.deepcopy(sse_fetcher.get_data())
    data['angle'] = server_options.get('show_angle', False)
    data['useChunk'] = server_options.get('use_chunk_coords', False)

    if data['stronghold'] and data['stronghold']['predictions']:
        data['stronghold'] = get_player_data(data['stronghold'], 'stronghold')
        return jsonify(data), 200 # stronghold
    elif data['stronghold'] and data['stronghold']['eyeThrows']:
        return jsonify(data), 210 # misread

    if data['blind'] and data['blind'].get('isBlindModeEnabled'):
        data['blind'] = get_player_data(data['blind'], 'blind')
        return jsonify(data), 220 # blind

    if data['divine'] and data['divine'].get('isDivineModeEnabled'):
        data['divine'] = get_player_data(data['divine'], 'divine')
        return jsonify(data), 230 # divine
    
    return jsonify(data), 250 # idle