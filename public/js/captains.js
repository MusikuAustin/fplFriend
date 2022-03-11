let cards = document.querySelector('.cards');
let radar = document.querySelector('.radar');
let captainStats = document.querySelector('.captain-stats');
let vcaptainStats = document.querySelector('.vcaptain-stats');
let captainsTable = document.querySelector('.captains-table');

const fetchGameweek = async () => {
    const nextGwQuery = 'gameweek(is_next: true) { ...GameWeekFields deadline_time }';
    const response = await graphQlQueryFetch(nextGwQuery);
    return response.data.gameweek;
}

const fetchCaptains = async () => {
    const query = `{
        players(captains:true, trim_extras: true){ 
            id web_name now_cost minutes form points_per_game bps chance_of_playing_next_round assists goals_scored total_points influence threat creativity selected_by_percent element_type 
            UpcomingFixtures(gw: 29){ 
                difficulty is_home team_h team_a 
        } } }`
    const response = await graphQlQueryFetch(query)
    return response.data.players;
}

let initHomepage = async () => {
    try{
        // get current gameweek from localStorage or fetch from graphQl endpoint
        let nextGw = localStorage.getItem('nextGw') ? JSON.parse(localStorage.getItem('nextGw')) : await fetchGameweek();

        // query players and gameweek from graphql
        let players = await fetchCaptains()
        // console.log(players)
        //
        // CAPTAINS TABLE
        // create opponent, fdr(fixture difficulty rating), and captaincy field for each player
        let captains = players
        .filter(player => player.UpcomingFixtures.length > 0)
        .map(captain => {
            let history = captain.form*0.3 + captain.points_per_game*0.3 + (captain.bps/captain.minutes)*0.4;
            let captaincy = (history*0.50 + (5 - captain.UpcomingFixtures[0].difficulty)*0.50).toFixed(2);
            // console.log(`${captain.web_name} -> ${captain.form}, ${captain.points_per_game}`);
            console.log(`${captain.web_name} -> ${captaincy}`);
            return {
                ...captain,
                history: history,
                fdr: captain.UpcomingFixtures[0].difficulty,
                opponent: captain.UpcomingFixtures[0].is_home? captain.UpcomingFixtures[0].team_a: captain.UpcomingFixtures[0].team_h,
                captaincy: captaincy
            }
        })
        
        let sortedCaptains = captains.sort((a,b) => (b.captaincy) - (a.captaincy)).slice(0, 15);

        // append row headings
        let rowHeadFields = `
        <th>Name</th>
        <th>Captaincy</th>
        <th>fix</th>
        `
        let rowHeads = document.createElement('tr');
        rowHeads.innerHTML = rowHeadFields;
        captainsTable.append(rowHeads);
        // populate captains table
        sortedCaptains.forEach(captain => {
            let rowfields = `
                <td><a href="/player/${captain.id}" class=" no-underline">${captain.web_name}</a></td>
                <td>${captain.captaincy}</td>
                <td class="fix-${captain.fdr} caption">${evaluateTeam(captain.opponent)}</td>
            `
            let row = document.createElement('tr');
            row.innerHTML = rowfields;
            document.querySelector('table').appendChild(row);
        })
        // remove spinner
        captainsTable.previousElementSibling.classList.add('invisible');

        // draw radar chart
        // select top two players on the captains table 
        let topTwo = sortedCaptains.slice(0,2);
        // topId == captains Id == player id of top element in captains table
        const topId = topTwo[0].id;

        // pick captain and vice colours
        let captainColor = '#f09292';
        let viceCaptainColor = '#3a4257';
        let captainFill = '#f092927d';
        let viceCaptainFill = '#3a42577d';

        let radarData = topTwo.map(player => {
            return {
                label: player.web_name,
                data: [ 
                    player.influence,
                    player.threat,
                    player.creativity
                ],
                backgroundColor: player.id === topId ? captainFill: viceCaptainFill,
                borderColor: player.id === topId ? captainColor: viceCaptainColor
            }
        })
        // instantiate chart
        const myChart = new Chart(radar, {
            type: 'radar',
            data: {
                labels: ['influence', 'threat', 'creativity'],
                datasets: radarData
            },
            options: {
                elements: {  line: { borderWidth: 1 }, point: { pointRadius: 1 } }
            }
        });
        // instatiate counter variable with 0
        let count = 0;
        topTwo.forEach( async (player) => {
        // When 0, populate captain column otherwise fill vice captain column
        let stats = count == 0 ? captainStats : vcaptainStats;

        let playerCardBottom = `
        <div class="column-heading"> 
            <p class="mini-heading ">${player.web_name}</p>
            <p class="mini-txt accent-font">${evaluatePosition(player.element_type)}</p>
        </div>
        <p>${player.total_points}</p>
        <p>${player.goals_scored}</p>
        <p>${player.assists}</p>
        <p>${player.bps}</p>
        <p>${player.fdr}</p>
        <p>${player.now_cost/10} m</p>
        <p>${player.selected_by_percent}%</p>`
        stats.innerHTML = playerCardBottom;
        count++;
    });

    }catch(err){
        throw err;
    }
}
initHomepage();