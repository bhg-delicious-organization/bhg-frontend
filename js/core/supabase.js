// ==================== supabase.js ====================
// Supabase 客戶端初始化
// 依賴：無
// ==================================================

const SUPABASE_URL = 'https://wvvmnombzkkrtxxxucqe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oK9kGQMbcBdGyoerrrfDzQ_yWyRZcQf';

let supabaseClient = null;

/**
 * 初始化 Supabase Client
 * @returns {Promise<Object>} Supabase Client
 */
async function initSupabase() {
  if (supabaseClient) return supabaseClient;

  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('✅ Supabase 已初始化');
  console.log('   URL:', SUPABASE_URL);

  return supabaseClient;
}

/**
 * 取得 Supabase Client（同步）
 * 如果還沒初始化，回傳 null
 */
function getSupabase() {
  return supabaseClient;
}

window.initSupabase = initSupabase;
window.getSupabase = getSupabase;

console.log('📡 supabase.js 已載入');
