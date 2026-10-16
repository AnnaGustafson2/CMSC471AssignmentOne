// set margin
const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

let allData = []
let dates = [];
let targetDate;
let weatherVar = 'TAVG';
let projection, colorScale;
let latRange, longRange;

const options = ['TAVG', 'TMAX', 'TMIN', 'PRCP'];
const labels = {TAVG: 'Average Temperature (F)', TMAX: 'Max Temperature (F)', TMIN: 'Min Temperature (F)', PRCP: 'Precipitation (inches)'};

//blank data cells turn into null
const num = v => v === '' ? null : +v;

function init(){
    d3.csv("./data/weather.csv", d => ({
        // Init everythin we may want later
        station: d.station,
        state: d.state,
        latitude: +d.latitude,
        longitude: +d.longitude,
        elevation: +d.elevation,
        date: d.date,
        TMIN: num(d.TMIN),
        TMAX: num(d.TMAX),
        TAVG: num(d.TAVG),
        AWND: +d.AWND,
        WDF5: +d.WDF5,
        WSF5: +d.WSF5,
        SNOW: +d.SNOW,
        SNWD: +d.SNWD,
        PRCP: num(d.PRCP)
    }))
        .then(data => {
            //console.log(data)
            allData = data
            dates = [... new Set(allData.map(d => d.date))]
                .sort();

            targetDate = dates[0];
            
            return d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
            })
        .then(us => {
            const states = topojson.feature(us, us.objects.states);
            projection = d3.geoAlbersUsa().fitSize([width, height], states);
            svg.append('g')
                .selectAll('path')
                .data(states.features)
                .join('path')
                .attr('d', d3.geoPath(projection))
                .attr('fill', 'grey')
                .attr('stroke', "white");
            
            const onMap = allData.filter(d => projection([d.longitude, d.latitude]));
            const latExtent = d3.extent(onMap, d => d.latitude);
            const longExtent = d3.extent(onMap, d => d.longitude);
            latRange = [Math.floor(latExtent[0]), Math.ceil(latExtent[1])];
            longRange = [Math.floor(longExtent[0]), Math.ceil(longExtent[1])];

            setupSelector()
            updateAxes()
            updateVis()
        })
    .catch(error => console.error('Error loading data:', error));
}

function setupSelector(){
    let slider = d3
        .sliderHorizontal()
        .min(0)
        .max(dates.length - 1)
        .step(1)
        .width(width - 100)  // Widen the slider if needed
        .displayValue(true)
        .displayFormat(i => {
            const date = dates[Math.round(i)];
            return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
        })
        .on('onchange', (val) => {
            targetDate = dates[Math.round(val)];
            updateVis();
        });

    d3.select('#slider')
        .append('svg')
        .attr('width', width)  // Adjust width if needed
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)')
        .call(slider);

    d3.selectAll('#weatherVariable')
    .each(function() {
        d3.select(this).selectAll('option')
            .data(options)
            .enter()
            .append('option')
            .text(d => labels[d])
            .attr("value", d => d)
    })
    .on("change", function(event) {
        weatherVar = d3.select(this).property("value");

        updateAxes();
        updateVis();
    });

    let latSlider = d3.sliderHorizontal()
        .min(latRange[0])
        .max(latRange[1])
        .step(1)
        .width(250)
        .default(latRange)
        .fill('#2196f3')
        .displayFormat(d3.format('d'))
        .tickFormat(d3.format('d'))
        .ticks(5)
        .on('onchange', (val) => {
            latRange = val;
            updateVis();
        });
    
    d3.select('#latSlider')
        .append('svg')
        .attr('width', 300)
        .attr('height', 80)
        .append('g')
        .attr('transform', 'translate(25, 30)')
        .call(latSlider);
    
    let longSlider = d3.sliderHorizontal()
        .min(longRange[0])
        .max(longRange[1])
        .step(1)
        .width(250)
        .default(longRange)
        .fill('#2196f3')
        .displayFormat(d3.format('d'))
        .tickFormat(d3.format('d'))
        .ticks(5)
        .on('onchange', (val) => {
            longRange = val;
            updateVis();
        });
    
    d3.select('#longSlider')
        .append('svg')
        .attr('width', 300)
        .attr('height', 80)
        .append('g')
        .attr('transform', 'translate(25, 30)')
        .call(longSlider);
}

function updateAxes() {
    svg.selectAll('.axis').remove();
    svg.selectAll('.labels').remove();

    colorScale = d3.scaleSequential()
        .domain(weatherVar === 'PRCP' ? d3.extent(allData, d => d[weatherVar]) : [0, 100])
        .interpolator(t => d3.interpolateRdYlBu(1 - t))
}

function updateVis() {
    let currentData = allData.filter(d => d.date === targetDate && projection([d.longitude, d.latitude]));

    svg.selectAll('.points')
        .data(currentData, d => `${d.station}-${d.state}`)
        .join(
            enter => enter
                .append('circle')
                .attr('class', 'points')
                .attr('cx', d => projection([d.longitude, d.latitude])[0])
                .attr('cy', d => projection([d.longitude, d.latitude])[1])
                .attr('r', 4)
                .style('fill', d => d[weatherVar] === null ? 'lightgrey' : colorScale(d[weatherVar]))
                .style('opacity', d => (d.latitude >= latRange[0] && d.latitude <= latRange[1] && d.longitude >= longRange[0] && d.longitude <= longRange[1]) ? 0.8 : 0.05)
                .style('pointer-events', d => (d.latitude >= latRange[0] && d.latitude <= latRange[1] && d.longitude >= longRange[0] && d.longitude <= longRange[1]) ? 'all' : 'none')
                .on('mouseover', function (event, d) {
                    const v = d[weatherVar];
                    const unit = weatherVar === 'PRCP' ? ' in' : ' F';
                    const value = v === null ? 'No reading' : v.toFixed(weatherVar === 'PRCP' ? 2 : 1) + unit;
                    d3.select('#tooltip')
                        .style('display', 'block')
                        .html( // Change the html content of the <div> directly
                            `<strong>${d.station}, ${d.state}</strong><br/>
                            Elevation: ${Math.round(d.elevation)} m<br/>
                            ${labels[weatherVar].split(' (')[0]}: ${value}`)
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    d3.select(this)
                        .style('stroke', 'black')
                        .style('stroke-width', '2px')
                })
                .on("mouseout", function (event, d) {
                    d3.select('#tooltip')
                        .style('display', 'none'); // Hide tooltip when cursor leaves
                    d3.select(this) // Refers to the hovered circle
                        .style('stroke', 'none')
                }),

            update => update
                .attr('cx', d => projection([d.longitude, d.latitude])[0])
                .attr('cy', d => projection([d.longitude, d.latitude])[1])
                .style('fill', d => d[weatherVar] === null ? 'lightgrey' : colorScale(d[weatherVar]))
                .style('opacity', d => (d.latitude >= latRange[0] && d.latitude <= latRange[1] && d.longitude >= longRange[0] && d.longitude <= longRange[1]) ? 0.8 : 0.06)
                .style('pointer-events', d => (d.latitude >= latRange[0] && d.latitude <= latRange[1] && d.longitude >= longRange[0] && d.longitude <= longRange[1]) ? 'all' : 'none'),

            exit => exit.remove()
        );
}

window.addEventListener('load', init);