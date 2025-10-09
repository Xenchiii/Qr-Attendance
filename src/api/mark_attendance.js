export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
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

    const data = await request.json();

    if (!data.student_id || !data.student_name || !data.class || !data.attendance_date || !data.attendance_time) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // THE ONLY CHANGE: Added 'status' field with 'present' value
      await env.DB.prepare(
        'INSERT INTO attendance_records (student_id, student_name, class, attendance_date, attendance_time, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        data.student_id,
        data.student_name,
        data.class,
        data.attendance_date,
        data.attendance_time,
        'present'  // ← THIS IS THE FIX
      ).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Attendance marked successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      if (error.message && error.message.includes('UNIQUE')) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Attendance already marked for today'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw error;
    }

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