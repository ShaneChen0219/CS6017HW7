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
    .join(
        enter =>{
            enter.append('p')
            .text((d,i)=>d)
            .on("click", handlePlayerOnClick)
        }
    )
}


//parameter e = event
//parameter d = data
function handlePlayerOnClick(e,d){
    let element = d3.select(this)
    element.classed("selected", !element.classed("selected"))



}