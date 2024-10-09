document.addEventListener('DOMContentLoaded', function () {
    const dataDiv = document.getElementById('data');
    let previousBoatState = null;

    const update = async () => {
        const res = await fetch('/get_data');

        if (res.ok) {
            const jsonData = await res.json();
            console.log(jsonData);

            if (jsonData.boat.boatState !== previousBoatState) {
                const headerHTML = generateHeaderHTML(jsonData.version, jsonData.boat.boatState);
                const existingHeader = document.getElementById('header-bar');
                if (existingHeader) {
                    existingHeader.remove();
                }
                dataDiv.insertAdjacentHTML('beforebegin', headerHTML);
                previousBoatState = jsonData.boat.boatState;
            }
            dataDiv.innerHTML = generateTable(jsonData, res.status);
        } else {
            dataDiv.innerHTML = "An error occurred.<br> Is your ninbot running and has the \"Enable API\" option on?";
        }
    };
    update();
    setInterval(update, 1000);
});

const generateTable = (jsonData, status) => {
    if (status === 200) {
        return generateStrongholdTable(jsonData.stronghold, jsonData.useChunk);
    } else if (status === 210) {
        return generateMisreadMessageTable(jsonData.stronghold);
    } else if (status === 220) {
        return generateBlindTable(jsonData.blind);
    } else if (status === 230) {
        return generateDivineTable(jsonData.divine);
    } else if (status === 250) {
        return generateIdleTable(jsonData.useChunk);
    }
    return '';
}

const generateHeaderHTML = (version, boatState) => `
    <div id="header-bar"> 
        <h1>Ninjabrain Bot<span>v${version}</span></h1>
        <ul>
            <li><img src="static/${getBoatIconFromState(boatState)}" style="image-rendering: pixelated;" /></li>
        </ul>
    </div>
`;

const generateTableHTML = (headers, bodyRows) => `
    <table id="data">
        <thead>
            <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
        </thead>
        <tbody>
            ${bodyRows.join('')}
        </tbody>
    </table>
    <div id="eye-throws-bar">
        <span>Ender eye throws</span>
        <div id="eye-throws-buttons">
            <button id="undo-button" class="eye-throw-button">Undo</button>
            <button id="redo-button" class="eye-throw-button">Redo</button>
            <button id="reset-button" class="eye-throw-button">Reset</button>
        </div>
    </div>
    <div id="sub-bar">
        <div class="eye_throw_stats">x</div>
        <div class="eye_throw_stats">z</div>
        <div class="eye_throw_stats">Angle</div>
        <div class="eye_throw_stats">Error</div>
    </div>
    <div id="location-grid">
        ${bodyRows.join('')}
    </div>
`;

document.addEventListener('DOMContentLoaded', function () {
    const undoButton = document.getElementById('undo-button');
    const redoButton = document.getElementById('redo-button');
    const resetButton = document.getElementById('reset-button');

    if (undoButton) {
        undoButton.addEventListener('click', () => {
            console.log('Undo clicked');
        });
    } else {
        console.error('undo-button element not found');
    }

    if (redoButton) {
        redoButton.addEventListener('click', () => {
            console.log('Redo clicked');
        });
    } else {
        console.error('redo-button element not found');
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            console.log('Reset clicked');
        });
    } else {
        console.error('reset-button element not found');
    }
});

const generateRowHTML = (cells) => `
    <tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>
`;

const generateStrongholdTable = (jsonData, toggleLocation) => {
    const headers = [
        toggleLocation ? 'Chunk' : 'Location',
        '%', 'Dist.', `Nether`,
    ].filter(Boolean);

    const bodyRows = jsonData.predictions.map(prediction => {
        const certainty = (prediction.certainty * 100).toFixed(1);
        const certaintyColor = getCertaintyColor(certainty);

        // TODO
        // const angleHTML = showAngle ?
        //     `${prediction.angle}
        //     <span style="color: ${getColorForDirection(prediction.direction)};">
        //         (${prediction.direction ? (prediction.direction > 0 ? "-> " : "<- ") + Math.abs(prediction.direction).toFixed(1) : "N/A"})
        //     </span>`
        //     : "";

        return generateRowHTML([
            `(${prediction.x}, ${prediction.z})`,
            `<span style="color:${certaintyColor}">${certainty}%</span>`,
            `${Math.round(prediction.overworldDistance)}`,
            `(${prediction.netherX}, ${prediction.netherZ})`
        ]);
    });

    updateSubBar(jsonData.predictions);

    return generateTableHTML(headers, bodyRows);
};

const updateSubBar = (predictions) => {
    const subBar = document.getElementById('sub-bar');
    if (!subBar) {
        console.error('sub-bar element not found');
        return;
    }

    const angleData = predictions.map(prediction => {
        const angleHTML = `${prediction.angle}
            <span style="color: ${getColorForDirection(prediction.direction)};">
                (${prediction.direction ? (prediction.direction > 0 ? "-> " : "<- ") + Math.abs(prediction.direction).toFixed(1) : "N/A"})
            </span>`;
        return generateRowHTML([angleHTML]);
    }).join('');

    subBar.innerHTML = `
        <div class="eye_throw_stats">x</div>
        <div class="eye_throw_stats">z</div>
        <div class="eye_throw_stats">Angle</div>
        <div class="eye_throw_stats">Error</div>
        ${angleData}
    `;
}

const generateMisreadMessageTable = (jsonData) => {
    const headers = ["&nbsp;"];
    const bodyRows = [
        generateRowHTML(["Could not determine the stronghold chunk."]),
        generateRowHTML(["You probably misread one of the eyes."]),
        ...Array(3).fill(generateRowHTML(["&nbsp;"]))
    ];

    return generateTableHTML(headers, bodyRows);
}

const generateBlindTable = (jsonData) => {
    const headers = ["&nbsp;"];
    const bodyRows = [];

    if (jsonData.blindResult) {
        const blind = jsonData.blindResult;
        const evaluationColor = getevaluationColor(blind.evaluation);

        bodyRows.push(generateRowHTML([
            `Blind coords (${blind.xInNether}, ${blind.zInNether}) are <span style="color:${evaluationColor}">${blind.evaluation}</span>`
        ]));
        bodyRows.push(generateRowHTML([
            `<span style="color:${evaluationColor}">${blind.highrollProbability}</span> chance of <400 block blind`
        ]));
        bodyRows.push(generateRowHTML([
            `${blind.improveDirection}°, ${blind.improveDistance} blocks away, for better coords`
        ]));
        bodyRows.push(...Array(2).fill(generateRowHTML(["&nbsp;"])));
    }

    return generateTableHTML(headers, bodyRows);
}

const generateDivineTable = (jsonData) => {
    const divineResult = jsonData.divineResult;

    const headers = [
        `Fossile ${divineResult.fossilXCoordinate}`, 's1', 's2', `s3`
    ];

    const bodyRows = [
        generateRowHTML(['Safe:', ...[0, 1, 2].map(index => `(${getDivineCoord(divineResult.formattedSafeCoords, index)})`)]),
        generateRowHTML(['Highroll:', ...[0, 1, 2].map(index => `(${getDivineCoord(divineResult.formattedHighrollCoords, index)})`)]),
        ...Array(3).fill(generateRowHTML(['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;']))
    ];

    return generateTableHTML(headers, bodyRows);
}

const generateIdleTable = (toggleLocation) => {
    const headers = [
        toggleLocation ? 'Chunk' : 'Location',
        '%', 'Dist.', `Nether`
    ].filter(Boolean);

    const bodyRows = Array(5).fill(generateRowHTML([
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;'
    ]));

    return generateTableHTML(headers, bodyRows);
}

const getCertaintyColor = (certainty) => {
    if (50 <= certainty) {
        return getColors('#d8c064', '#59b94b', 51, Math.floor(certainty-50));
    } else {
        return getColors('#bd4141', '#d8c064', 51, Math.floor(certainty));
    }
}

const getColorForDirection = (direction) => {
    const absdirection = Math.abs(direction);
    let color;

    if (absdirection <= 180) {
        color = getColors('#bd4141', '#59b94b', 181, Math.floor(180 - absdirection));
    } else {
        color = '#d8c064';
    }
    return color;
}

function hexToRgb(hexColor) {
    hexColor = hexColor.replace('#', '');
    return [
        parseInt(hexColor.substring(0, 2), 16),
        parseInt(hexColor.substring(2, 4), 16),
        parseInt(hexColor.substring(4, 6), 16)
    ];
}

function rgbToHex(rgbColor) {
    return `#${((1 << 24) + (rgbColor[0] << 16) + (rgbColor[1] << 8) + rgbColor[2]).toString(16).slice(1)}`;
}

function interpolateColors(color1, color2, steps) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const interpolatedColors = [];

    for (let step = 0; step < steps; step++) {
        const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * step / (steps - 1));
        const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * step / (steps - 1));
        const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * step / (steps - 1));
        interpolatedColors.push(rgbToHex([r, g, b]));
    }
    return interpolatedColors;
}

function getColors(color1, color2, steps, getstep) {
    const colors = interpolateColors(color1, color2, steps);
    return colors[getstep];
}

const evaluationColors = {
    'excellent': { color1: '#d8c064', color2: '#59b94b', steps: 51, step: 50 },
    'good for highroll': { color1: '#d8c064', color2: '#59b94b', steps: 51, step: 40 },
    'okay for highroll': { color1: '#d8c064', color2: '#59b94b', steps: 51, step: 25 },
    'bad, but in ring': { color1: '#d8c064', color2: '#59b94b', steps: 51, step: 0 },
    'bad': { color1: '#bd4141', color2: '#d8c064', steps: 51, step: 25 },
    'not in any ring': { color1: '#bd4141', color2: '#d8c064', steps: 51, step: 0 }
};

const getevaluationColor = (evaluation) => {
    const colorInfo = evaluationColors[evaluation];
    if (colorInfo) {
        return getColors(colorInfo.color1, colorInfo.color2, colorInfo.steps, colorInfo.step);
    }
    return '#FFFFFF'
}

const getDivineCoord = (coords, index) => {
    const coordsArray = coords.split("), (").map(coord => coord.replace(/[()]/g, '').trim());

    if (index >= 0 && index < coordsArray.length) {
        return coordsArray[index];
    } else {
        return null;
    }
}

const getBoatIconFromState = (state) => {
    switch (state) {
        case 'NONE':
            return 'assets/boat_gray.png'
        case 'ERROR':
            return 'assets/boat_red.png'
        case 'MEASURING':
            return 'assets/boat_blue.png'
        case 'VALID':
            return 'assets/boat_green.png'
    }
}