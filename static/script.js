document.addEventListener('DOMContentLoaded', function () {
    const update = async () => {
        const res = await fetch('/events');
        if (res.status === 200) {
            const el = document.getElementById('sse-data');
            const jsonData = await res.json();

            let tableHTML = `
                <table id="sse-data">
                    <thead>
                        <tr>
                            <th>Location</th>
                            <th>%</th>
                            <th>Dist.</th>
                            <th>Nether</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            jsonData.predictions.forEach((prediction, index) => {
                let certainty = (prediction.certainty * 100).toFixed(1);
                let certaintyColor = getCertaintyColor(certainty);

                tableHTML += `
                    <tr>
                        <td>(${prediction.chunkX * 16}, ${prediction.chunkZ * 16})</td>
                        <td style="color:${certaintyColor}">${certainty}%</td>
                        <td>${Math.round(prediction.overworldDistance)}</td>
                        <td>(${prediction.chunkX * 2}, ${prediction.chunkZ * 2})</td>
                    </tr>
                `;
            });

            tableHTML += `
                    </tbody>
                </table>
            `;

            el.outerHTML = tableHTML;
        }
    }

    setInterval(update, 1000);
});

const getCertaintyColor = (certainty) => {
    if (certainty <= 10) {
        return 'red'
    }
    if (certainty <= 20) {
        return 'orange'
    }
    if (certainty <= 50) {
        return 'yellow'
    }
    if (certainty <=70) {
        return 'lightgreen'
    }
    if (certainty <= 85) {
        return 'green'
    }

    return 'cyan'
}