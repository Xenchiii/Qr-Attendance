export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Database not bound'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const classFilter = url.searchParams.get('class');
    
    let stmt;
    if (classFilter && classFilter !== 'all') {
      stmt = env.DB.prepare('SELECT * FROM students WHERE class = ? ORDER BY student_name').bind(classFilter);
    } else {
      stmt = env.DB.prepare('SELECT * FROM students ORDER BY student_name');
    }
    
    const result = await stmt.all();
    
    return new Response(JSON.stringify({
      success: true,
      data: result.results || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}