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

// Utility: Fix common Shift_JIS to Unicode mapping issues (Mojibake of symbols)
const fixMojibake = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/\u301C/g, '\uFF5E') // 波ダッシュ (Wave Dash) -> 全角チルダ
        .replace(/\u2212/g, '\uFF0D') // マイナス (Minus) -> 全角マイナス
        .replace(/\u00A2/g, '\uFFE0') // セント
        .replace(/\u00A3/g, '\uFFE1') // ポンド
        .replace(/\u00AC/g, '\uFFE2') // ノット
        .replace(/\u2014/g, '\u2015') // ダッシュ
        .replace(/\u2016/g, '\u2225'); // 双柱
};

// Fetch external master data (master.csv) deployed on server
const loadExternalMasterData = () => {
    // キャッシュを回避するためにタイムスタンプを付与
    fetch(`master.csv?t=${new Date().getTime()}`)
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
                                const val = row[k] ? fixMojibake(String(row[k]).trim()) : '';
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

            // まずUTF-8 (fatal: true) としてデコードを試みる
            // Pre-process buffer to fix MacJapanese specific bytes (e.g., curly quotes ’ in 's choice)
            // Mac Shift-JIS uses 0x85xx for some symbols which are unassigned in Windows-31J and become 
            const view = new Uint8Array(buffer);
            for (let i = 0; i < view.length - 1; i++) {
                if (view[i] === 0x85) {
                    if (view[i+1] === 0x48) { view[i] = 0x81; view[i+1] = 0x66; i++; } // ’ (Right Single Quote)
                    else if (view[i+1] === 0x47) { view[i] = 0x81; view[i+1] = 0x65; i++; } // ‘ (Left Single Quote)
                    else if (view[i+1] === 0x4A) { view[i] = 0x81; view[i+1] = 0x68; i++; } // ” (Right Double Quote)
                    else if (view[i+1] === 0x49) { view[i] = 0x81; view[i+1] = 0x67; i++; } // “ (Left Double Quote)
                    else if (view[i+1] === 0x44) { view[i] = 0x81; view[i+1] = 0x63; i++; } // … (Ellipsis)
                }
            }

            let text = '';
            try {
                // fatal: true にすることで、Shift-JISなどの非UTF-8文字列が混ざっていると例外が発生する
                text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
            } catch (e) {
                // UTF-8で読み込めなかった（デコード失敗）場合は Windows-31J (より正確なShift-JIS) としてデコード
                console.warn("UTF-8 decoding failed. Retrying with Windows-31J...");
                text = new TextDecoder('Windows-31J').decode(buffer);
            }

            let extracted = tryParse(text);

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
            // If we are opening a local file:// without a server, fetch fails. Provide a warning once.
            if (window.location.protocol === 'file:' && !localStorage.getItem('fileProtocolWarned')) {
                console.warn("Local file:// protocol detected. Cannot fetch master.csv automatically.");
                localStorage.setItem('fileProtocolWarned', 'true');
            }
        });
};

// Global function to clear corrupted cache manually
window.clearCacheAndReload = () => {
    localStorage.removeItem('brandMasterData');
    alert('過去の誤ったデータを削除しました！リロードします。');
    location.reload();
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

// Utility: Escape HTML to correctly display & and preventing XSS
const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
                    <h2 class="brand-name">${escapeHTML(brand.name)} <span class="brand-furigana">${escapeHTML(brand.en)}</span></h2>
                </div>
                <div class="rank-badge ${rankClass}">${escapeHTML(brand.rank)}</div>
            </div>
            <div class="card-body">
                <div class="notes-label"><i class="ph ph-info"></i> 備考</div>
                <p class="notes-text">${escapeHTML(brand.notes)}</p>
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
                    const val = row[k] ? fixMojibake(String(row[k]).trim()) : '';
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
