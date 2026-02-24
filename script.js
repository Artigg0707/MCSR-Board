document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration --- //
    const players = ['JstCone', 'homaktop226']; 
    const API_URL = 'https://api.mcsrranked.com/users/';
    
    // --- DOM Elements --- //
    const tableBody = document.getElementById('tableBody');
    const playerInput = document.getElementById('playerInput');
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    const errorMessage = document.getElementById('error-message');
    
    let playerDataList = []; // Array to store fetched player data
    let fetchPromises = []; // To keep track of loading

    // --- Ranks Configuration --- //
    // Thresholds: Netherite (2000+), Diamond (1500+), Emerald (1200+), Gold (900+), Iron (600+), Coal (0+)
    const RANKS = [
        { name: 'Netherite', minElo: 2000, icon: 'https://minecraft.wiki/images/Netherite_Ingot_JE1_BE2.png' },
        { name: 'Diamond', minElo: 1500, icon: 'https://minecraft.wiki/images/Diamond_JE3_BE3.png' },
        { name: 'Emerald', minElo: 1200, icon: 'https://minecraft.wiki/images/Emerald_JE3_BE3.png' },
        { name: 'Gold', minElo: 900, icon: 'https://minecraft.wiki/images/Gold_Ingot_JE4_BE2.png' },
        { name: 'Iron', minElo: 600, icon: 'https://minecraft.wiki/images/Iron_Ingot_JE3_BE2.png' },
        { name: 'Coal', minElo: 0, icon: 'https://minecraft.wiki/images/Coal_JE4_BE3.png' }
    ];

    function getRank(elo) {
        if (!elo || elo <= 0) return null;
        return RANKS.find(r => elo >= r.minElo) || RANKS[RANKS.length - 1];
    }
    
    // --- Time Formatter --- //
    // Converts milliseconds to MM:SS.ms (e.g., 16:58.192)
    function formatTime(ms) {
        if (!ms || ms === 0) return '<span class="na-text">N/A</span>';
        
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        
        // Pad with zeros (e.g., 5 -> "05")
        const formattedMin = String(minutes).padStart(2, '0');
        const formattedSec = String(seconds).padStart(2, '0');
        const formattedMs = String(milliseconds).padStart(3, '0');
        
        return `${formattedMin}:${formattedSec}.${formattedMs}`;
    }

    // --- Data Fetcher --- //
    async function fetchPlayerData(username) {
        try {
            const response = await fetch(`${API_URL}${username}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Игрок "${username}" не найден.`);
                }
                throw new Error(`Ошибка сети: ${response.status}`);
            }
            
            const data = await response.json();
            return processData(data);
        } catch (error) {
            console.error(error);
            showError(error.message);
            return null; // Return null on error
        }
    }

    // --- Data Processor --- //
    function processData(apiData) {
        const stats = apiData.data?.statistics?.season; 

        if (!stats) {
             return {
                nickname: apiData.data?.nickname || 'Unknown',
                elo: apiData.data?.eloRate || 0,
                rankedParams: { average_time: formatTime(0), best_time: formatTime(0), wins: 0, losses: 0 },
                casualParams: { average_time: formatTime(0), best_time: formatTime(0), wins: 0, losses: 0 }
            };
        }

        const getVal = (field, category) => (stats[field] && stats[field][category] !== undefined && stats[field][category] !== null) ? stats[field][category] : 0;

        const calcAvg = (category) => {
            const time = getVal('completionTime', category);
            const count = getVal('completions', category);
            return count > 0 ? time / count : 0;
        };

        return {
            nickname: apiData.data.nickname,
            elo: apiData.data.eloRate || 0,
            rankedParams: {
                average_time: formatTime(calcAvg('ranked')),
                best_time: formatTime(getVal('bestTime', 'ranked')),
                wins: getVal('wins', 'ranked'),
                losses: getVal('loses', 'ranked')
            },
            casualParams: {
                average_time: formatTime(calcAvg('casual')),
                best_time: formatTime(getVal('bestTime', 'casual')),
                wins: getVal('wins', 'casual'),
                losses: getVal('loses', 'casual')
            }
        };
    }

    // --- Table Renderer --- //
    // Default sorting function (by Elo Descending)
    function renderTable(dataList) {
        tableBody.innerHTML = ''; // Clear current table

        if (dataList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="11">Нет данных</td></tr>';
            return;
        }

        // Sort: Elo Descending
        dataList.sort((a, b) => b.elo - a.elo);

        dataList.forEach((player, index) => {
            const tr = document.createElement('tr');
            
            // Determine Rank
            const rankObj = getRank(player.elo);
            const rankIconHtml = rankObj ? 
                `<img src="${rankObj.icon}" alt="${rankObj.name}" title="${rankObj.name}" class="rank-icon-img">` : '';

            // Build the row HTML
            tr.innerHTML = `
                <td class="rank-cell">#${index + 1}</td>
                <td class="name-cell">
                    <a href="https://mcsrranked.com/profiles/${player.nickname}" target="_blank" class="player-link">
                        ${player.nickname}
                    </a>
                </td>
                
                <!-- Ranked -->
                <td class="elo-cell">
                    ${player.elo > 0 ? player.elo : '<span class="na-text">-</span>'}
                    ${rankIconHtml}
                </td>
                <td class="time-cell">${player.rankedParams.average_time}</td>
                <td class="time-cell">${player.rankedParams.best_time}</td>
                <td class="win-cell">${player.rankedParams.wins}</td>
                <td class="loss-cell">${player.rankedParams.losses}</td>
                
                <!-- Casual -->
                <td class="time-cell">${player.casualParams.average_time}</td>
                <td class="time-cell">${player.casualParams.best_time}</td>
                <td class="win-cell">${player.casualParams.wins}</td>
                <td class="loss-cell">${player.casualParams.losses}</td>
            `;
            
            tableBody.appendChild(tr);
        });
    }

    // --- Error Handling --- //
    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000); // Hide after 5s
    }

    // --- Initialization Logic --- //
    async function init() {
        // Show loading state
        tableBody.innerHTML = '<tr class="loading-row"><td colspan="11">Загрузка данных...</td></tr>';
        
        // Create promises for initial players
        const promises = players.map(name => fetchPlayerData(name));
        
        // Wait for all to finish (Promise.allSettled avoids stopping on one error)
        const results = await Promise.all(promises);
        
        // Filter out nulls (failed requests) and populate list
        playerDataList = results.filter(p => p !== null);
        
        renderTable(playerDataList);
    }

    // --- Input Handler --- //
    addPlayerBtn.addEventListener('click', async () => {
        const username = playerInput.value.trim();
        if (!username) return;

        // Prevent duplicates
        if (playerDataList.some(p => p.nickname.toLowerCase() === username.toLowerCase())) {
            showError('Этот игрок уже есть в списке!');
            return;
        }

        // Disable button while pending
        addPlayerBtn.disabled = true;
        addPlayerBtn.textContent = '...';

        const newPlayer = await fetchPlayerData(username);
        
        if (newPlayer) {
            playerDataList.push(newPlayer);
            renderTable(playerDataList); // Re-render (including sort)
            playerInput.value = ''; // Clear input
        }
        
        // Re-enable button
        addPlayerBtn.disabled = false;
        addPlayerBtn.textContent = 'Добавить';
    });

    // Start
    init();
});
