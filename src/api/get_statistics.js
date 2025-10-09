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
    const date = url.searchParams.get('date');

    if (!date) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Date parameter is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const totalStudents = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM students'
    ).first();
    
    // THE ONLY CHANGE: Filter by status = 'present'
    const presentStudents = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM attendance_records WHERE attendance_date = ? AND status = "present"'
      // ← THIS IS THE FIX: Added 'AND status = "present"'
    ).bind(date).first();
    
    const total = totalStudents?.count || 0;
    const present = presentStudents?.count || 0;
    const absent = total - present;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        total_students: total,
        present_students: present,
        absent_students: absent,
        attendance_rate: rate
      }
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