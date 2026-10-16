// set margin
const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const svg = d3
  .select("#vis")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

  const mapGroup = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", (event) => {
    mapGroup.attr("transform", event.transform);
  });

svg.call(zoom);

let allData = [];
let dates = [];
let targetDate;
let weatherVar = "TAVG";
let projection, colorScale;
let latRange, longRange;

const options = ["TMAX", "TMIN", "PRCP", "TAVG"];
const labels = {
  TAVG: "Average Temperature (F)",
  TMAX: "Max Temperature (F)",
  TMIN: "Min Temperature (F)",
  PRCP: "Precipitation (inches)",
};

//blank data cells turn into null
const num = (v) => (v === "" ? null : +v);

function init() {
  d3.csv("./data/weather.csv", (d) => ({
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
    PRCP: num(d.PRCP),
  }))
    .then((data) => {
      //console.log(data)
      allData = data;
      dates = [...new Set(allData.map((d) => d.date))].sort();
      targetDate = dates[0];
      return d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
    })
    .then((us) => {
      const states = topojson.feature(us, us.objects.states);
      projection = d3.geoAlbersUsa().fitSize([width, height], states);
      mapGroup
        .append("g")
        .selectAll("path")
        .data(states.features)
        .join("path")
        .attr("d", d3.geoPath(projection))
        .attr("fill", "grey")
        .attr("stroke", "white");

      const onMap = allData.filter((d) =>
        projection([d.longitude, d.latitude]),
      );
      const latExtent = d3.extent(onMap, (d) => d.latitude);
      const longExtent = d3.extent(onMap, (d) => d.longitude);
      latRange = [Math.floor(latExtent[0]), Math.ceil(latExtent[1])];
      longRange = [Math.floor(longExtent[0]), Math.ceil(longExtent[1])];

      setupSelector();
      updateAxes();
      updateVis();
    })
    .catch((error) => console.error("Error loading data:", error));
}

function updateDateDisplay() {
  const y = +targetDate.slice(0, 4);
  const m = +targetDate.slice(4, 6) - 1;
  const day = +targetDate.slice(6, 8);
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = new Date(y, m, 1).toLocaleString("en-US", { month: "long" });
  d3.select("#currentDate").text(`${month} ${day}${suffix}, ${y}`);
}

function setupSelector() {
  const monthStarts = [];
  dates.forEach((d, i) => {
    if (i === 0 || d.slice(4, 6) !== dates[i - 1].slice(4, 6))
      monthStarts.push(i);
  });
  const numMonths = monthStarts.length;
  const monthLen = (m) => (monthStarts[m + 1] ?? dates.length) - monthStarts[m];
  const valueToIndex = (v) => {
    const m = Math.min(Math.floor(v), numMonths - 1);
    const f = v - m;
    return (
      monthStarts[m] + Math.min(monthLen(m) - 1, Math.floor(f * monthLen(m)))
    );
  };

  let slider = d3
    .sliderHorizontal()
    .min(0)
    .max(numMonths)
    .width(width)
    .displayValue(false)
    .tickValues(monthStarts.map((_, m) => m + 0.5))
    .tickFormat((v) => {
      const d = dates[monthStarts[Math.floor(v)]];
      return new Date(2000, +d.slice(4, 6) - 1, 1).toLocaleString("en-US", {
        month: "long",
      });
    })
    .on("onchange", (val) => {
      targetDate = dates[valueToIndex(val)];
      updateDateDisplay();
      updateVis();
    });

  d3.select("#slider")
    .append("svg")
    .attr("width", width)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(30,30)")
    .call(slider);
  updateDateDisplay();

  d3.selectAll("#weatherVariable")
    .each(function () {
      d3.select(this)
        .selectAll("option")
        .data(options)
        .enter()
        .append("option")
        .text((d) => labels[d])
        .attr("value", (d) => d);
    })
    .on("change", function (event) {
      weatherVar = d3.select(this).property("value");

      updateAxes();
      updateVis();
    });

  let latSlider = d3
    .sliderHorizontal()
    .min(latRange[0])
    .max(latRange[1])
    .step(1)
    .width(250)
    .default(latRange)
    .fill("#2196f3")
    .displayFormat(d3.format("d"))
    .tickFormat(d3.format("d"))
    .ticks(5)
    .on("onchange", (val) => {
      latRange = val;
      updateVis();
    });

  d3.select("#latSlider")
    .append("svg")
    .attr("width", 300)
    .attr("height", 80)
    .append("g")
    .attr("transform", "translate(25, 30)")
    .call(latSlider);

  let longSlider = d3
    .sliderHorizontal()
    .min(longRange[0])
    .max(longRange[1])
    .step(1)
    .width(250)
    .default(longRange)
    .fill("#2196f3")
    .displayFormat(d3.format("d"))
    .tickFormat(d3.format("d"))
    .ticks(5)
    .on("onchange", (val) => {
      longRange = val;
      updateVis();
    });

  d3.select("#longSlider")
    .append("svg")
    .attr("width", 300)
    .attr("height", 80)
    .append("g")
    .attr("transform", "translate(25, 30)")
    .call(longSlider);
}

function updateLegend() {
  const [lo, hi] = colorScale.domain();
  const stops = d3
    .range(0, 1.01, 0.1)
    .map((t) => `${colorScale(lo + t * (hi - lo))} ${t * 100}%`)
    .join(", ");
  d3.select("#legendBar").style(
    "background",
    `linear-gradient(to right, ${stops})`,
  );

  if (weatherVar === "PRCP") {
    d3.select("#legendLeft").text(`${lo.toFixed(1)} in`);
    d3.select("#legendRight").text(`${hi.toFixed(1)} in`);
  } else {
    d3.select("#legendLeft").text("Cold");
    d3.select("#legendRight").text("Hot");
  }
}

function updateAxes() {
  svg.selectAll(".axis").remove();
  svg.selectAll(".labels").remove();

  colorScale = d3
    .scaleSequential()
    .domain(
      weatherVar === "PRCP"
        ? d3.extent(allData, (d) => d[weatherVar])
        : [0, 100],
    )
    .interpolator((t) =>
      d3.interpolateRdYlBu(weatherVar === "PRCP" ? 1 - t : 1 - t),
    );

  updateLegend();
}

function updateVis() {
  let currentData = allData.filter(
    (d) => d.date === targetDate && projection([d.longitude, d.latitude]),
  );

  mapGroup
    .selectAll(".points")
    .data(currentData, (d) => `${d.station}-${d.state}`)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "points")
          .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
          .attr("cy", (d) => projection([d.longitude, d.latitude])[1])
          .attr("r", 4)
          .style("fill", (d) =>
            d[weatherVar] === null ? "lightgrey" : colorScale(d[weatherVar]),
          )
          .style("opacity", (d) =>
            d.latitude >= latRange[0] &&
            d.latitude <= latRange[1] &&
            d.longitude >= longRange[0] &&
            d.longitude <= longRange[1]
              ? 0.8
              : 0.05,
          )
          .style("pointer-events", (d) =>
            d.latitude >= latRange[0] &&
            d.latitude <= latRange[1] &&
            d.longitude >= longRange[0] &&
            d.longitude <= longRange[1]
              ? "all"
              : "none",
          )
          .on("mouseover", function (event, d) {
            const v = d[weatherVar];
            const unit = weatherVar === "PRCP" ? " in" : " F";
            const value =
              v === null
                ? "No reading"
                : v.toFixed(weatherVar === "PRCP" ? 2 : 1) + unit;
            d3.select("#tooltip")
              .style("display", "block")
              .html(
                // Change the html content of the <div> directly
                `<strong>${d.station}, ${d.state}</strong><br/>
                            Elevation: ${Math.round(d.elevation)} m<br/>
                            ${labels[weatherVar].split(" (")[0]}: ${value}`,
              )
              .style("left", event.pageX + 20 + "px")
              .style("top", event.pageY - 28 + "px");
            d3.select(this)
              .style("stroke", "black")
              .style("stroke-width", "2px");
          })
          .on("mouseout", function (event, d) {
            d3.select("#tooltip").style("display", "none"); // Hide tooltip when cursor leaves
            d3.select(this) // Refers to the hovered circle
              .style("stroke", "none");
          }),

      (update) =>
        update
          .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
          .attr("cy", (d) => projection([d.longitude, d.latitude])[1])
          .style("fill", (d) =>
            d[weatherVar] === null ? "lightgrey" : colorScale(d[weatherVar]),
          )
          .style("opacity", (d) =>
            d.latitude >= latRange[0] &&
            d.latitude <= latRange[1] &&
            d.longitude >= longRange[0] &&
            d.longitude <= longRange[1]
              ? 0.8
              : 0.06,
          )
          .style("pointer-events", (d) =>
            d.latitude >= latRange[0] &&
            d.latitude <= latRange[1] &&
            d.longitude >= longRange[0] &&
            d.longitude <= longRange[1]
              ? "all"
              : "none",
          ),

      (exit) => exit.remove(),
    );
}

window.addEventListener("load", init);
