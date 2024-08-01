import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
let players
let selectedPlayer =[]
let playerCountryMap = new Map();
let selectedCountries = new Map();

window.onload = async () => {
    
    let data = await d3.csv("./all_seasons.csv");
    let playerSet = new Set()
    for (let player of data) {
        playerSet.add(player.player_name)
        playerCountryMap.set(player.player_name, player.country); // Also create a map to pull this players country 
    }
    players = Array.from(playerSet).sort()
    makePlayerList()
  
    // Used to know which flags I need to get from google
    let countries = Array.from(new Set(data.map(d => d.country)));
    console.log("Unique Countries:", countries);
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
        updateCountry(d)
    }else{
        selectedPlayer =selectedPlayer.filter(player => player.name !== d);
        updateCountry(d, true)
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
    // .each(function(d) {
    //     console.log("The selected names are: " + d.name);
    // })
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


// As a player is selected or unselected, add or remove their country
function updateCountry(currentPlayer, deselect, activeEdges) {

    // Get this players country
    let currentCountry = playerCountryMap.get(currentPlayer);

    // Check if this country has already been added to our map. If it has, check if we need to increment, decrement, or remove it entirely
    if (selectedCountries.has(currentCountry)){

        // Get count of players under this country
        let currentValue = selectedCountries.get(currentCountry);

        // If user deselects a player, remove or decrement
        if (deselect){
            console.log("Time to remove.");

            // If there is only one player under this country, remove it
            if (currentValue <= 1){
                selectedCountries.delete(currentCountry);
            }
            // Otherwise, decrement the count
            else{
                selectedCountries.set(currentCountry, currentValue -= 1);
            }
        }
        
        // If a user selects a player, increment
        else{
            selectedCountries.set(currentCountry, currentValue += 1);
            console.log("Time to add.");
        }
    }
    // This country has not yet been added to our map, simply add
    else{   
        selectedCountries.set(currentCountry, 1);
    }



    const div = d3.select('#country');
    div.selectAll('img').remove(); // Reset the flags

    // Append and reprint updated flags
    selectedCountries.forEach(function(_, key){
        div.append('img')
            .attr('src', "FlagImages\\" + String(key) + ".png")
            .attr('alt', 'Country flag')
            .style('width', '125px')
            .style('height', '125px')
            .on('mouseover', mouseOverTitle)
            .on('mouseout', mouseOutTitle)
            .text(currentCountry);
    });


    // Now I have access to each of the nodes names. Now I just need to add a "country" attribute to each node. 
    // Note: Likey each flag will need a "country" tag attached to it simiar to this: let movie = d3.select(this).text(); 
    // Just set the text like he did above and pull it.

    let canvas = d3.select('#canvas')
    canvas
    .selectAll('g')
    .each(function(d) {
        console.log("The current name is: " + d.name);
    })
}


function mouseOverTitle(e, d){
    // Bold the border
    d3.select(this)
        .style('border', '5px solid black'); 
    
    let currentFlag = d3.select(this).text(); 
    console.log("The current country selected is: " + currentFlag);

    // Emphasize the nodes that have this same country 
    d3.select('#canvas')
    .selectAll('circle')
    .transition()
    .duration(200)
    .attr('stroke-width', 10)
    .attr('fill', 'lightgreen');
}



function mouseOutTitle(e, d){
    // Unbold border
    d3.select(this)
        .style('border', 'none');
        
    d3.select('#canvas')
    .selectAll('circle')
    .transition()
    .duration(200)
    .attr('stroke-width', 2)
    .attr('fill', 'white');
}