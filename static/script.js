document.addEventListener('DOMContentLoaded', function () {
    const dataDiv = document.getElementById('data');
    let previousboatState = null;
    let previousangle = {};
    let previousdirection = {};

    const update = async () => {
        const res = await fetch('/get_data');

        if (res.ok) {
            const jsonData = await res.json();
            console.log(jsonData);

            if (jsonData.boat.boatState !== previousboatState) {
                previousboatState = jsonData.boat.boatState;
            }
            jsonData.stronghold.predictions.forEach((predictions, index) => {
                if (predictions.angle === null && predictions.direction === null) {
                    predictions.angle = previousangle[index];
                    predictions.direction = previousdirection[index];
                } else {
                    previousangle[index] = predictions.angle;
                    previousdirection[index] = predictions.direction;
                }
            });            
            dataDiv.innerHTML = `<div id="data-wrapper">` + generateTable(jsonData, res.status);
            dataDiv.innerHTML += generateEyeThrowsTable(jsonData.stronghold.eyeThrows) + `</div>`;
        } else {
            dataDiv.innerHTML = "An error occurred.<br> Is your ninbot running and has the \"Enable API\" option on?";
        }
    }

    update();
    setInterval(update, 1000);
});

const generateTable = (jsonData, status) => {
    switch (status) {
        case 200:
            return generateStrongholdTable(jsonData.stronghold, jsonData.useChunk, jsonData.angle, jsonData.boat.boatState);
        case 210:
            return generateMisreadMessageTable();
        case 220:
            return generateBlindTable(jsonData.blind);
        case 230:
            return generateDivineTable(jsonData.divine);
        case 250: 
            return generateIdleTable(jsonData.useChunk, jsonData.angle);
        default:
            return ""
    }
}

const generateEyeThrowsTable = (eyeThrows) => {
    const rows = eyeThrows.map((eyeThrow) => {
        return generateRowHTML([
            `${eyeThrow.xInOverworld}`,
            `${eyeThrow.zInOverworld}`,
            `${eyeThrow.angle.toFixed(1)}`,
            `${eyeThrow.error.toFixed(4)}`
        ]);
    });

    return generateTableHTML(["x", "z", "Angle", "Error"], rows, undefined, "throws", 'throw-header');
}

const generateTableHTML = (headers, bodyRows, headerWidths = undefined, id = 'data', headerClass = 'header') => {
    const width = Array.isArray(headerWidths) && headerWidths.length === headers.length
        ? headerWidths : Array(headers.length).fill(100 / headers.length);

    return `
        <table id="${id}">
            <thead>
                <tr class='${headerClass}'>${headers.map((header, index) => `<th style="width: ${width[index]}%;"><div class="${headerClass}-content">${header}</div></th>`).join('')}</tr>
            </thead>
            <tbody>
                ${bodyRows.join('')}
            </tbody>
        </table>
    `;
};

const generateRowHTML = (cells) => `
    <tr class='throw-row'>${cells.map(cell => `<td class='throw-content'>${cell}</td>`).join('')}</tr>
`;

const generateStrongholdTable = (jsonData, toggleLocation, showAngle, boatState) => {
    const boatHtml = `<img id="boat-icon" src="static/${getBoatIconFromState(boatState)}"  />`;
    const headers = [
        toggleLocation ? 'Chunk' : 'Location',
        '%', 'Dist.', `Nether`,
        showAngle ? `Angle ${boatHtml}` : boatHtml
    ].filter(Boolean);

    const bodyRows = jsonData.predictions.map(prediction => {
        const certainty = (prediction.certainty * 100).toFixed(1);
        const certaintyColor = getCertaintyColor(certainty);

        const angleHTML = showAngle ? 
            `${prediction.angle ? prediction.angle : "---"}
            <span style="color: ${getColorForDirection(prediction.direction)};"> 
                (${prediction.direction ? (prediction.direction > 0 ? "-> " : "<- ") + Math.abs(prediction.direction).toFixed(1) : "N/A"})
            </span>` 
            : "";

        return generateRowHTML([
            `(${prediction.x}, ${prediction.z})`,
            `<span style="color:${certaintyColor}">${certainty}%</span>`,
            `${Math.round(prediction.distance)}`,
            `(${prediction.netherX}, ${prediction.netherZ})`,
            angleHTML
        ]);
    });

    const headerWidths = showAngle ? [26, 13, 13, 22, 26] : [32, 18, 18, 32];
    return generateTableHTML(headers, bodyRows, headerWidths);
};

const generateMisreadMessageTable = () => {
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
        `Fossil ${divineResult.fossilXCoordinate}`, 's1', 's2', `s3`
    ];

    const bodyRows = [
        generateRowHTML(['Safe:', ...[0, 1, 2].map(index => `(${getDivineCoord(divineResult.formattedSafeCoords, index)})`)]),
        generateRowHTML(['Highroll:', ...[0, 1, 2].map(index => `(${getDivineCoord(divineResult.formattedHighrollCoords, index)})`)]),
        ...Array(3).fill(generateRowHTML(['&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;']))
    ];

    return generateTableHTML(headers, bodyRows);
}

const generateIdleTable = (toggleLocation, showAngle) => {
    const headers = [
        toggleLocation ? 'Chunk' : 'Location',
        '%', 'Dist.', `Nether`,
        showAngle ? `Angle` : ""
    ].filter(Boolean);

    const bodyRows = Array(5).fill(generateRowHTML([
        '&nbsp;', '&nbsp;', '&nbsp;', '&nbsp;', showAngle ? '&nbsp;' : ''
    ]));

    const headerWidths = showAngle ? [26, 13, 13, 22, 26] : [32, 18, 18, 32];
    return generateTableHTML(headers, bodyRows, headerWidths);
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