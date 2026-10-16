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
let xScale, yScale, colorScale;

const options = ['TAVG', 'PRCP'];
const labels = {TAVG: 'Average Temperature (F)', PRCP: 'Precipitation (inches)'};

function init(){
    d3.csv("./data/weather.csv", d => ({
        // Init everythin we may want later
        station: d.station,
        state: d.state,
        latitude: +d.latitude,
        longitude: +d.longitude,
        elevation: +d.elevation,
        date: d.date,
        TMIN: +d.TMIN,
        TMAX: +d.TMAX,
        TAVG: +d.TAVG,
        AWND: +d.AWND,
        WDF5: +d.WDF5,
        WSF5: +d.WSF5,
        SNOW: +d.SNOW,
        SNWD: +d.SNWD,
        PRCP: +d.PRCP
    }))
    .then(data => {
            //console.log(data)
            allData = data
            dates = [... new Set(allData.map(d => d.date))]
                .sort();

            targetDate = dates[0];

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
}

function updateAxes() {
    svg.selectAll('.axis').remove();
    svg.selectAll('.labels').remove();

    xScale = d3.scaleLinear()
        .domain(d3.extent(allData, d => d.longitude))
        .range([0, width]);

    yScale = d3.scaleLinear()
        .domain(d3.extent(allData, d => d.latitude))
        .range([height, 0]);

    colorScale = d3.scaleSequential()
        .domain(d3.extent(allData, d => d[weatherVar]))
        .interpolator(t => d3.interpolateRdYlBu(1 - t))

    const xAxis = d3.axisBottom(xScale).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);

    svg.append('g')
        .attr('class', 'axis')
        .call(yAxis);

    svg.append('text')
        .attr('class', 'labels')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .text('Longitude');

    svg.append('text')
        .attr('class', 'labels')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 25)
        .attr('text-anchor', 'middle')
        .text('Latitude');
}

function updateVis() {
    let currentData = allData.filter(d => d.date === targetDate);

    svg.selectAll('.points')
        .data(currentData, d => `${d.station}-${d.state}`)
        .join(
            enter => enter
                .append('circle')
                .attr('class', 'points')
                .attr('cx', d => xScale(d.longitude))
                .attr('cy', d => yScale(d.latitude))
                .attr('r', 4)
                .style('fill', d => colorScale(d[weatherVar]))
                .style('opacity', 0.8),

            update => update
                .attr('cx', d => xScale(d.longitude))
                .attr('cy', d => yScale(d.latitude))
                .style('fill', d => colorScale(d[weatherVar])),

            exit => exit.remove()
        );
}

window.addEventListener('load', init);