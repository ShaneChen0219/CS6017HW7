import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
let players
let selectedPlayer =[]
window.onload = async () => {
    
    let data = await d3.csv("./all_seasons.csv");
    let playerSet = new Set()
    for (let player of data) {
        playerSet.add(player.player_name)
    }
    players = Array.from(playerSet).sort()
    makePlayerList()

}

function makePlayerList(){
    
    d3.select('#nbaplayers').selectAll('p')
    .data(players)
    // in join there are 3 actions enter, update and exit
    .join(
        // enter selection 
        enter =>{
            enter.append('p')
            //d represents the data, which is player and i represents the index of the data(player)
            .text((d,i)=>d)
            .on("click", handlePlayerOnClick)
        }
    )
}


//parameter e = event: passed by the event listener
//parameter d = data
function handlePlayerOnClick(e,d){
    // select the clicked element
    let element = d3.select(this)
    element.classed("selected", !element.classed("selected"))

    if(element.classed('selected')){
        let canvasWidth = parseFloat(d3.select('#canvas').style('width'))
        let canvasHeight = parseFloat(d3.select('#canvas').style('height'))
        //Use object to contain data
        let playerData ={}
        playerData.name = d
        playerData.x = canvasWidth * Math.random();
        playerData.y = canvasHeight * Math.random();
        selectedPlayer.push(playerData)
    }else{
        selectedPlayer =selectedPlayer.filter(player => player.name !== d);
    }
    updateGraph()
}

function updateGraph(){
    let canvas = d3.select('#canvas')

    canvas
    .selectAll('g')
    // d is an single item in the selectedPlayer array
    // (d) => d.name key function, helping the DOM to uniquely identify data items
    .data(selectedPlayer, (d) => d.name)
    .join( (enter) => { 
        //Append the element(DOM)
        let groups = enter.append('g')

        groups.append('circle')
            .attr('cx', (d, i) => d.x)
            .attr('cy', (d, i) => d.y)
            .attr('r', 50)
            .attr('fill', 'red')
            .attr('stroke', 'black')
        
        groups.append('text')
            .text(d => d.name)
            .attr('x', (d, i) => d.x)
            .attr('y', (d, i) => d.y)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle');
    
        return groups
    }, (update)=> {
        //anything which was already joined the last time
        return update.selectAll('circle')
            .transition()
            .duration(1000)
            .attr('fill', 'white')
    }, (remove)=> {
        //DOM elements with no corresponding array data
        remove.remove()
    })
    updateSimulation()
}

//Create dynamic, interactive layouts where nodes (elements) are affected by forces like attraction or gravity
let simulation = d3.forceSimulation()
function updateSimulation(){
    //Get the width and height of the canvas, parse it to float cuz the attribute returns a string
    const canvasWidth = parseFloat(d3.select('#canvas').style('width'));
    const canvasHeight = parseFloat(d3.select('#canvas').style('height'));
    //Set the simulation for all the selectedPlayers
    simulation.nodes(selectedPlayer)
        //Add a force from the center to keep all nodes kind of centered
        //.force("type of the force",the force)
        .force('center', d3.forceCenter(canvasWidth/2, canvasHeight/2))
        //Repel nodes from each other if .strength is negative
        .force("charge", d3.forceManyBody().strength(-50))
        // on tick means each iteration
        .on('tick', () => {
            let groups = d3.select('#canvas').selectAll('g')
            groups.selectAll('circle')
                .attr('cx', (d, i) => d.x)
                .attr('cy', (d, i) => d.y)
        })
        //The temperature of the simulation
        .alphaTarget(0.1)
        // Slow down the simulation
        .restart();
}