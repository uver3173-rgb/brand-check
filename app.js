// Mock Data
let brands = [
    {
        id: 1,
        name: "エルメス",
        furigana: "えるめす",
        en: "Hermes",
        rank: "S",
        notes: "最高級皮革製品、バーキンやケリーが代表的"
    },
    {
        id: 2,
        name: "シャネル",
        furigana: "しゃねる",
        en: "Chanel",
        rank: "S",
        notes: "高級アパレル・コスメ、マトラッセが人気"
    },
    {
        id: 3,
        name: "グッチ",
        furigana: "ぐっち",
        en: "Gucci",
        rank: "A",
        notes: "幅広い層に人気、GG柄が象徴的"
    },
    {
        id: 4,
        name: "ルイ・ヴィトン",
        furigana: "るいゔぃとん",
        en: "Louis Vuitton",
        rank: "A",
        notes: "定番のモノグラムやダミエで有名"
    },
    {
        id: 5,
        name: "コーチ",
        furigana: "こーち",
        en: "Coach",
        rank: "B",
        notes: "手の届くラグジュアリー（アクセシブル・ラグジュアリー）"
    }
];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const csvFileInput = document.getElementById('csvFileInput');
const resultsContainer = document.getElementById('resultsContainer');
const noResults = document.getElementById('noResults');

// Utility: Convert Hiragana to Katakana (or vice versa for robust checking)
// Here we'll just normalize everything to Hiragana or convert to lowercase
const normalizeString = (str) => {
    return str.toLowerCase()
              .replace(/[\u30a1-\u30f6]/g, function(match) {
                  return String.fromCharCode(match.charCodeAt(0) - 0x60);
              });
};

// Render Cards
const renderCards = (data) => {
    resultsContainer.innerHTML = '';
    
    if (data.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    
    data.forEach(brand => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const rawRankClass = `rank-${brand.rank.toLowerCase()}`;
        // Fallback to default if CSS class does not exist for the specific rank
        const rankClass = ['rank-s', 'rank-a', 'rank-b'].includes(rawRankClass) ? rawRankClass : 'rank-default';
        
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h2 class="brand-name">${brand.name} <span class="brand-furigana">${brand.en}</span></h2>
                </div>
                <div class="rank-badge ${rankClass}">Rank ${brand.rank}</div>
            </div>
            <div class="card-body">
                <div class="notes-label"><i class="ph ph-info"></i> 備考</div>
                <p class="notes-text">${brand.notes}</p>
            </div>
        `;
        
        resultsContainer.appendChild(card);
    });
};

// Search Logic
const handleSearch = (e) => {
    const query = normalizeString(e.target.value.trim());
    
    if (!query) {
        renderCards(brands);
        return;
    }
    
    const filtered = brands.filter(brand => {
        const normalizedName = normalizeString(brand.name);
        const normalizedFurigana = normalizeString(brand.furigana);
        const normalizedEn = brand.en.toLowerCase();
        
        return normalizedName.includes(query) || 
               normalizedFurigana.includes(query) || 
               normalizedEn.includes(query);
    });
    
    renderCards(filtered);
};

// Event Listeners
searchInput.addEventListener('input', handleSearch);

csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data;
            const newBrands = data.map((row, index) => {
                return {
                    id: index + 1,
                    name: row['ブランド名'] || row['Brand'] || row['brand'] || '',
                    furigana: row['フリガナ'] || row['ふりがな'] || '',
                    en: row['英語'] || row['英語名'] || '',
                    rank: row['区分'] || row['Rank'] || row['rank'] || '不明',
                    notes: row['備考'] || row['Notes'] || row['notes'] || ''
                };
            }).filter(b => b.name); // ブランド名がない行は除外

            if (newBrands.length > 0) {
                brands = newBrands;
                handleSearch({ target: { value: searchInput.value } });
            } else {
                alert('有効なデータが見つかりませんでした。「ブランド名」列が存在するか確認してください。');
            }
            
            // Reset input so the same file can be selected again
            e.target.value = '';
        },
        error: function(err) {
            alert('CSVの読み込みに失敗しました。');
            console.error(err);
            e.target.value = '';
        }
    });
});

// Initial Render
renderCards(brands);
