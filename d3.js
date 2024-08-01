import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
let players
let selectedPlayer = []
let playerCountryMap = new Map();
let selectedCountries = new Map();
let playerEdges = {}

window.onload = async () => {
    let data = await d3.csv("./all_seasons.csv");
    let playerSet = new Set()
    for (let player of data) {
        let playerName = player.player_name;
        playerSet.add(playerName)
        playerCountryMap.set(playerName, player.country); // Also create a map to pull this players country 
        if (!(playerName in playerEdges)) {
            playerEdges[playerName] = { "team": new Set(), "related": [] }
        }
        playerEdges[playerName]["team"].add(player.team_abbreviation)
    }
    players = Array.from(playerSet).sort()
    makePlayerList()
    await populatePlayerEdges(data, playerEdges);
    // Used to know which flags I need to get from google
    let countries = Array.from(new Set(data.map(d => d.country)));
}

async function populatePlayerEdges(data, playerEdges) {
    for (let player of data) {
        let playerName = player.player_name;
        let playerTeams = playerEdges[playerName]["team"];

        for (let otherPlayer of data) {
            if (otherPlayer.player_name !== playerName && playerTeams.has(otherPlayer.team_abbreviation)) {
                playerEdges[playerName]["related"].push(otherPlayer.player_name);
            }
        }
    }
}

function makePlayerList() {
    d3.select('#nbaplayers').selectAll('p')
        .data(players)
        // in join there are 3 actions enter, update and exit
        .join(
            // enter selection 
            enter => {
                enter.append('p')
                    //d represents the data, which is player and i represents the index of the data(player)
                    .text((d, i) => d)
                    .on("click", handlePlayerOnClick)
            }
        )
}

//parameter e = event: passed by the event listener
//parameter d = data
function handlePlayerOnClick(e, d) {
    // select the clicked element
    let element = d3.select(this)
    element.classed("selected", !element.classed("selected"))

    if (element.classed('selected')) {
        let canvasWidth = parseFloat(d3.select('#canvas').style('width'))
        let canvasHeight = parseFloat(d3.select('#canvas').style('height'))
        //Use object to contain data
        let playerData = {}
        playerData.name = d
        playerData.x = canvasWidth * Math.random();
        playerData.y = canvasHeight * Math.random();
        selectedPlayer.push(playerData)
    } else {
        selectedPlayer = selectedPlayer.filter(player => player.name !== d);
    }
    updateGraph()
    updateCountry(d)
}
const circleRadius = 50;

function updateGraph() {
    let activeEdges = []
    let edgeSet = new Set();
    for(let player of selectedPlayer){
        for(let relatedPlayer of playerEdges[player.name]["related"]){
            if(relatedPlayer> player.name && selectedPlayer.find(x=>x.name==relatedPlayer)){
                let edge = {
                    // The value has to be an object so the updateEdgePositions can trace the nodes
                    "source":player,
                    "target":selectedPlayer.find(x=>x.name==relatedPlayer),
                }
                // Create a string representation of the edge
                let edgeString = JSON.stringify(edge);
                // Check if the edge is already in the set
                if (!edgeSet.has(edgeString)) {
                    activeEdges.push(edge);
                    edgeSet.add(edgeString);
                }
            }
        }
    }
    console.log(activeEdges)   
    let canvas = d3.select('#canvas')

    canvas.selectAll('line')
        .data(activeEdges, (d)=> d.source.name + d.target.name)
        .join(
            enter=>{
                enter.append("line")
                    .call(updateEdgePositions)
                    .attr('stroke', d => ratingColor(d))
                    .attr('stroke-width', 2);
            }
        )

    canvas
        .selectAll('g')
        // d is an single item in the selectedPlayer array
        // (d) => d.name key function, helping the DOM to uniquely identify data items
        .data(selectedPlayer, (d) => d.name)
        .join((enter) => {
            //Append the element(DOM)
            let groups = enter.append('g')

            let circles = groups.append('circle')
                .attr('cx', (d, i) => d.x)
                .attr('cy', (d, i) => d.y)
                .attr('r', circleRadius)
                .attr('fill', 'red')
                .attr('stroke', 'black')

            let texts = groups.append('text')
                .text(d => d.name)
                .attr('x', (d, i) => d.x)
                .attr('y', (d, i) => d.y)

            return groups
        }, (update) => {
            //anything which was already joined the last time
            return update.selectAll('circle')
                .transition()
                .duration(1000)
                .attr('fill', 'white')
        }, (remove) => {
            //DOM elements with no corresponding array data
            remove.remove()
        })
    updateSimulation(activeEdges)
}

function updateEdgePositions(edges) {
    edges
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
}

function ratingColor(edge) {
    return d3.interpolateLab("red", "green")(edge.season);
}

function boundingBox() {
    const width = parseFloat(d3.select('#canvas').style('width'));
    const height = parseFloat(d3.select('#canvas').style('height'));
    
    return (alpha) => {
        for (let i = 0, n = selectedPlayer.length; i < n; ++i) {
            const node = selectedPlayer[i];
            node.x = Math.max(circleRadius, Math.min(width - circleRadius, node.x));
            node.y = Math.max(circleRadius, Math.min(height - circleRadius, node.y));
        }
    };
}


//Create dynamic, interactive layouts where nodes (elements) are affected by forces like attraction or gravity
let simulation = d3.forceSimulation()
function updateSimulation(activeEdges) {
    //Get the width and height of the canvas, parse it to float cuz the attribute returns a string
    const canvasWidth = parseFloat(d3.select('#canvas').style('width'));
    const canvasHeight = parseFloat(d3.select('#canvas').style('height'));

    //Set the simulation for all the selectedPlayers
    simulation.nodes(selectedPlayer)
        //Add a force from the center to keep all nodes kind of centered
        //.force("type of the force",the force)
        .force('center', d3.forceCenter(canvasWidth / 2, canvasHeight / 2))
        //Repel nodes from each other if .strength is negative
        .force("charge", d3.forceManyBody().strength(-5000))
        .force('spring', d3.forceLink(activeEdges)
        // Specify the identifier for the nodes
        .id(d => d.name)
        .distance(10)
        // Adjust the strength of the force
        .strength(0.05))
        // Add the bounding box force to keep the nodes in the canvas
        .force('bounding-box', boundingBox())
        // on tick means each iteration
        .on('tick', () => {
            let groups = d3.select('#canvas').selectAll('g')
            groups.selectAll('circle')
                .attr('cx', (d, i) => d.x)
                .attr('cy', (d, i) => d.y)

            groups.select('text')
                .attr('x', (d, i) => d.x - circleRadius)
                .attr('y', (d, i) => d.y);

            d3.selectAll('line')
                .call(updateEdgePositions);
        })
        //The temperature of the simulation
        .alphaTarget(0.1)
        // Slow down the simulation
        .restart();
}


// As a player is selected, their country (and a count of the players FROM that country) will show on our "#country" as a flag.
function updateCountry(currentPlayer, activeEdges) {
    // Get this players country
    let currentCountry = playerCountryMap.get(currentPlayer);

    // Add or Increment in our countries map
    if (selectedCountries.has(currentCountry)) {
        let currentValue = selectedCountries.get(currentCountry);
        selectedCountries.set(currentCountry, currentValue += 1);
    }
    else {
        selectedCountries.set(currentCountry, 1);
    }


    const div = d3.select('#country');
    div.selectAll('img').remove(); // Reset the flags

    // Append and reprint updated flags
    selectedCountries.forEach(function (_, key) {
        div.append('img')
            .attr('src', "FlagImages\\" + String(key) + ".png")
            .attr('alt', 'Country flag')
            .style('width', '125px')
            .style('height', '125px');
    });
}