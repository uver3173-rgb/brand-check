// Default Mock Data
const defaultBrands = [
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

// Load from LocalStorage or use default
let brands = [...defaultBrands];
try {
    const saved = localStorage.getItem('brandMasterData');
    if (saved) {
        brands = JSON.parse(saved);
    }
} catch (e) {
    console.error('Failed to parse localStorage data', e);
}

// Save function
const saveBrands = () => {
    localStorage.setItem('brandMasterData', JSON.stringify(brands));
};

// Fetch external master data (master.csv) deployed on server
const loadExternalMasterData = () => {
    fetch('master.csv')
        .then(response => {
            if (!response.ok) throw new Error('master.csv not found on server');
            return response.arrayBuffer(); // バイナリとして取得
        })
        .then(buffer => {
            // パース処理を共通化
            const tryParse = (decodedText) => {
                let parsedBrands = [];
                Papa.parse(decodedText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        const data = results.data;
                        const cleanKey = (k) => k.replace(/^[\uFEFF\u200B\xA0\s]+|[\uFEFF\u200B\xA0\s]+$/g, '').toLowerCase();

                        parsedBrands = data.map((row) => {
                            let name = '', furigana = '', en = '', rank = '不明', notes = '';
                            for (const k in row) {
                                const ck = cleanKey(k);
                                const val = row[k] ? String(row[k]).trim() : '';
                                if (!val) continue;

                                if (ck.includes('ブランド') || ck.includes('brand') || ck.includes('名前') || ck.includes('name')) {
                                    name = name || val;
                                } else if (ck.includes('フリガナ') || ck.includes('ふりがな') || ck.includes('kana')) {
                                    furigana = furigana || val;
                                } else if (ck.includes('英語') || ck.includes('en')) {
                                    en = en || val;
                                } else if (ck.includes('区分') || ck.includes('ランク') || ck.includes('rank') || ck.includes('class')) {
                                    rank = rank === '不明' ? val : rank;
                                } else if (ck.includes('備考') || ck.includes('note')) {
                                    notes = notes || val;
                                }
                            }
                            return { name, furigana, en, rank, notes };
                        }).filter(b => b.name);
                    }
                });
                return parsedBrands;
            };

            // まずUTF-8としてデコード
            let text = new TextDecoder('utf-8').decode(buffer);
            let extracted = tryParse(text);

            // UTF-8で読み込めなかった（文字化けでキーが見つからない）場合は Shift-JIS を試す
            if (extracted.length === 0) {
                console.warn("UTF-8 decoding resulted in 0 brands. Retrying with Shift-JIS...");
                text = new TextDecoder('shift_jis').decode(buffer);
                extracted = tryParse(text);
            }

            if (extracted.length > 0) {
                extracted.forEach((b, i) => b.id = i + 1);
                brands = extracted;
                saveBrands();
                
                if (typeof handleSearch === 'function' && searchInput) {
                    handleSearch({ target: { value: searchInput.value } });
                } else {
                    renderCards(brands);
                }
                console.log("External master.csv loaded and applied successfully.");
            } else {
                console.log("Could not extract valid brands from master.csv.");
            }
        })
        .catch(err => {
            console.log("No external master.csv loaded:", err.message);
        });
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const csvFileInput = document.getElementById('csvFileInput');
const csvEncoding = document.getElementById('csvEncoding');
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

    const encoding = csvEncoding.value;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: encoding,
        complete: function(results) {
            const data = results.data;
            if (data.length > 0) {
                console.log(`CSV 読み込み結果 (エンコード: ${encoding}):`, Object.keys(data[0]));
            }

            const cleanKey = (k) => k.replace(/^[\uFEFF\u200B\xA0\s]+|[\uFEFF\u200B\xA0\s]+$/g, '').toLowerCase();

            const newBrands = data.map((row) => {
                let name = '', furigana = '', en = '', rank = '不明', notes = '';
                
                for (const k in row) {
                    const ck = cleanKey(k);
                    const val = row[k] ? String(row[k]).trim() : '';
                    if (!val) continue;

                    if (ck.includes('ブランド') || ck.includes('brand') || ck.includes('名前') || ck.includes('name')) {
                        name = name || val;
                    } else if (ck.includes('フリガナ') || ck.includes('ふりがな') || ck.includes('kana')) {
                        furigana = furigana || val;
                    } else if (ck.includes('英語') || ck.includes('en')) {
                        en = en || val;
                    } else if (ck.includes('区分') || ck.includes('ランク') || ck.includes('rank') || ck.includes('class')) {
                        rank = rank === '不明' ? val : rank;
                    } else if (ck.includes('備考') || ck.includes('note')) {
                        notes = notes || val;
                    }
                }
                
                return { name, furigana, en, rank, notes };
            }).filter(b => b.name); // ブランド名がない行は除外

            if (newBrands.length > 0) {
                newBrands.forEach(newBrand => {
                    const existingIndex = brands.findIndex(b => b.name === newBrand.name);
                    if (existingIndex >= 0) {
                        // Update existing
                        brands[existingIndex] = { ...brands[existingIndex], ...newBrand };
                    } else {
                        // Insert new
                        newBrand.id = brands.length > 0 ? Math.max(...brands.map(b => b.id || 0)) + 1 : 1;
                        brands.push(newBrand);
                    }
                });
                saveBrands();
                handleSearch({ target: { value: searchInput.value } });
                e.target.value = ''; // Reset input
            } else {
                alert(`有効なデータが見つかりませんでした。「ブランド名」（または「Brand」など）を含む列があるか確認してください。\n文字化けしている可能性があるため、文字コード設定（現在: ${encoding}）を見直してお試しください。`);
                e.target.value = '';
            }
        },
        error: function(err) {
            console.error(err);
            alert('CSVの読み込みに失敗しました。');
            e.target.value = '';
        }
    });
});

// Initial Render
renderCards(brands);

// Attempt to load master.csv asynchronously
loadExternalMasterData();
