export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Handle GET (for testing)
  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      success: true,
      message: 'Student attendance API is working',
      methods: ['GET', 'POST']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Handle POST
  if (request.method === 'POST') {
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

      if (!data.student_id || !data.student_name || !data.class || !data.qr_code) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Missing required fields'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await env.DB.prepare(
        'INSERT INTO students (student_id, student_name, class, qr_code) VALUES (?, ?, ?, ?)'
      ).bind(data.student_id, data.student_name, data.class, data.qr_code).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Student registered successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      if (error.message && error.message.includes('UNIQUE')) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Student already registered'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: false,
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Method not allowed
  return new Response('Method Not Allowed', {
    status: 405,
    headers: corsHeaders
  });
}