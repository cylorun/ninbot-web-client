import customtkinter as ctk
import requests
import server
import socket
import webbrowser
import qrcode
import io
import threading

from PIL import Image

PORT = server.PORT
VERSION = 'v1.2.0'

ctk.set_appearance_mode("dark")

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title(f"Ninbot Web Client {VERSION}")
        self.geometry("400x430")


        qr_label = ctk.CTkLabel(self, text="", width=100, height=100)
        qr_label.pack(pady=20)
        qr_img = self.get_qr_code(App.get_ninb_page_url())
        qr_label.configure(image=qr_img)
        qr_label.image = qr_img
        
        link_label = ctk.CTkLabel(self, text=f"{App.get_ninb_page_url()}", text_color="yellow", fg_color="transparent", cursor="hand2")
        link_label.pack(pady=10)
        link_label.bind("<Button-1>", lambda e: webbrowser.open(App.get_ninb_page_url()))
        
        if App.has_update():
            update_label = ctk.CTkLabel(self, text=f"NEW UPDATE AVAILABLE!! CLICK TO DOWNLOAD!!!", text_color="yellow", fg_color="transparent", cursor="hand2")
            update_label.pack(pady=10)
            update_label.bind("<Button-1>", lambda e: webbrowser.open("https://github.com/cylorun/ninbot-web-client/releases/latest"))

        self.var_use_chunk_coords = ctk.BooleanVar()
        self.entry_use_chunk_coords = ctk.CTkCheckBox(self, text="Use Chunk Coords", variable=self.var_use_chunk_coords)
        self.entry_use_chunk_coords.pack(pady=10)
        self.entry_use_chunk_coords.bind("<Button-1>", lambda e: threading.Thread(target=self.update_options, daemon=True).start())

        self.var_show_angle = ctk.BooleanVar()
        self.entry_show_angle = ctk.CTkCheckBox(self, text="Show angle", variable=self.var_show_angle)
        self.entry_show_angle.pack(pady=10)
        self.entry_show_angle.bind("<Button-1>", lambda e: threading.Thread(target=self.update_options, daemon=True).start())

        self.fetch_initial_options()

    def fetch_initial_options(self):
        try:
            response = requests.get(f'http://localhost:{PORT}/get_options')
            if response.status_code == 200:
                options = response.json()

                self.var_use_chunk_coords.set(options.get('use_chunk_coords', False))
                self.var_show_angle.set(options.get('show_angle', False))
        except requests.RequestException as e:
            print(f"Error fetching options: {e}")

    def update_options(self):
        use_chunk_coords_value = True if self.entry_use_chunk_coords.get() == 1 else False
        show_angle_value = True if self.entry_show_angle.get() == 1 else False
        
        try:
            print('updating options....')
            requests.post(f'http://localhost:{PORT}/update_option', json={"option": "use_chunk_coords", "value": use_chunk_coords_value})
            requests.post(f'http://localhost:{PORT}/update_option', json={"option": "show_angle", "value": show_angle_value})
            print('updated options')
        except requests.RequestException as e:
            print(f"error updating options: {e}")
    
    def get_qr_code(self, url):
        img = qrcode.make(url)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG") 
        buffer.seek(0)
        pil_image = Image.open(buffer)
        return ctk.CTkImage(pil_image, size=(150, 150))
    
    @staticmethod
    def get_ninb_page_url():
        ip = App.get_local_ip()
        return f'http://{ip}:{PORT}'
    
    @staticmethod
    def get_local_ip():
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except Exception as e:
            print(f"error getting ip: {e}")

    @staticmethod
    def get_latest_github_release(repo):
        url = f"https://api.github.com/repos/{repo}/releases/latest"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            release_data = response.json()
            latest_version = release_data["tag_name"]
            return latest_version
        except requests.exceptions.RequestException as e:
            print(f"Error fetching the latest release from GitHub: {e}")
            return None

    @staticmethod
    def compare_versions(current_version, latest_version):

        def version_tuple(version):
            return tuple(map(int, (version.strip('v').split("."))))
        
        current = version_tuple(current_version)
        latest = version_tuple(latest_version)
        
        return latest > current

    @staticmethod
    def has_update():
        latest_version = App.get_latest_github_release('cylorun/ninbot-web-client')
        
        return latest_version and App.compare_versions(VERSION, latest_version)

if __name__ == '__main__':
    flask_process = threading.Thread(target=server.run_flask, daemon=True)
    flask_process.start()

    app = App()
    app.mainloop()