// Mock Data
const brands = [
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
        
        const rankClass = `rank-${brand.rank.toLowerCase()}`;
        
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

// Initial Render
renderCards(brands);
