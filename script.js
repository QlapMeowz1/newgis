
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([105.85, 21.02]), 
        zoom: 12
    })
});

// lay layerGeoJSON
async function createLayer(sourceUrl, color) {
    try {
        let response = await fetch(sourceUrl);
        let data = await response.json();
        if (!data.features) throw new Error("Dữ liệu không hợp lệ");

        let features = data.features.map(feature => {
            let coords = feature.geometry.coordinates;
            let point = new ol.geom.Point(ol.proj.fromLonLat([coords[1], coords[0]]));
            
            let marker = new ol.Feature({
                geometry: point,
                name: feature.properties.name,
                address: feature.properties.address
            });

            marker.setStyle(new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({ color }), 
                    stroke: new ol.style.Stroke({ color: 'white', width: 2 })
                }),
                text: new ol.style.Text({
                    text: feature.properties.name, 
                    font: 'bold 12px Arial', 
                    fill: new ol.style.Fill({ color }), 
                    stroke: new ol.style.Stroke({ color: 'white', width: 3 }), 
                    offsetY: -12 
                })
            }));
            return marker;
        });

        let vectorSource = new ol.source.Vector({ features });
        let layer = new ol.layer.Vector({
            source: vectorSource
        });

        map.addLayer(layer);
        return layer;
    } catch (error) {
        console.error("Lỗi khi tạo layer:", error);
        return null;
    }
}



const layers = {};

const WFS = (workspace, layer) =>
    `http://localhost:8080/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=${workspace}:${layer}&outputFormat=application/json`;

Promise.all([
    createLayer(WFS('myproject', 'kfc'), 'red').then(layer => layers.kfc = layer),
    createLayer(WFS('myproject', 'lotte'), 'blue').then(layer => layers.lotte = layer),
    createLayer(WFS('myproject', 'jollibee'), 'orange').then(layer => layers.jollibee = layer)
]).then(() => {
   
    document.getElementById("kfc-layer").addEventListener("change", (e) => {
        if (layers.kfc) layers.kfc.setVisible(e.target.checked);
    });
    document.getElementById("lotte-layer").addEventListener("change", (e) => {
        if (layers.lotte) layers.lotte.setVisible(e.target.checked);
    });
    document.getElementById("jollibee-layer").addEventListener("change", (e) => {
        if (layers.jollibee) layers.jollibee.setVisible(e.target.checked);
    });
});

const popup = document.getElementById("popup");
const overlay = new ol.Overlay({ element: popup, positioning: 'bottom-center', stopEvent: false });
map.addOverlay(overlay);

map.on('click', event => {
    let featureFound = false;
    map.forEachFeatureAtPixel(event.pixel, feature => {
        popup.innerHTML = `<b>${feature.get('name')}</b><br>${feature.get('address')}`;
        overlay.setPosition(feature.getGeometry().getCoordinates());
        popup.style.display = 'block';
        featureFound = true;
    });
    if (!featureFound) popup.style.display = 'none';
});

const coordinateDisplay = document.createElement("div");
coordinateDisplay.id = "coordinateDisplay";
coordinateDisplay.style.cssText = "position:absolute;bottom:10px;left:10px;padding:5px 10px;background:rgba(0,0,0,0.7);color:#fff;border-radius:5px;font-size:12px;";
document.body.appendChild(coordinateDisplay);

map.on('pointermove', event => {
    let coord = ol.proj.toLonLat(event.coordinate);
    coordinateDisplay.innerHTML = `Tọa độ: ${coord[1].toFixed(6)}, ${coord[0].toFixed(6)}`;
});

let allDatas = [];
async function fetchAllData() {
    let urls = [
        { url: WFS('myproject', 'kfc'), type: "kfc" },
        { url: WFS('myproject', 'lotte'), type: "lotte" },
        { url: WFS('myproject', 'jollibee'), type: "jollibee" }
    ];

    for (let item of urls) {
        try {
            let response = await fetch(item.url);
            let data = await response.json();
            if (!data.features) continue;

            allDatas.push(...data.features.map(feature => ({
                name: feature.properties.name,
                address: feature.properties.address,
                coordinates: feature.geometry.coordinates,
                type: item.type
            })));
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        }
    }
}
fetchAllData();


