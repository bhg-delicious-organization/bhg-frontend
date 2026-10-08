// ==================== supabase.js ====================
// Supabase 客戶端初始化（Promise 單例）
// ==================================================

const SUPABASE_URL = 'https://wvvmnombzkkrtxxxucqe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oK9kGQMbcBdGyoerrrfDzQ_yWyRZcQf';

let supabaseClient = null;
let supabaseInitPromise = null;   // ✅ 新增

/**
 * 初始化 Supabase Client（Promise 單例）
 */
async function initSupabase() {
  // 已初始化 → 回傳
  if (supabaseClient) return supabaseClient;

  // 正在初始化 → 回傳同一個 Promise
  if (supabaseInitPromise) return supabaseInitPromise;

  // 開始初始化
  supabaseInitPromise = (async () => {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('✅ Supabase 已初始化');
    console.log('   URL:', SUPABASE_URL);

    return supabaseClient;
  })();

  return supabaseInitPromise;
}

/**
 * 取得 Supabase Client（同步）
 */
function getSupabase() {
  return supabaseClient;
}

window.initSupabase = initSupabase;
window.getSupabase = getSupabase;

console.log('📡 supabase.js 已載入');
