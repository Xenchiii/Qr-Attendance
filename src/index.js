export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Register Student
      if (path === '/api/register_student' && request.method === 'POST') {
        const data = await request.json();
        
        try {
          await env.DB.prepare(
            'INSERT INTO students (student_id, student_name, class, qr_code) VALUES (?, ?, ?, ?)'
          ).bind(
            data.student_id,
            data.student_name,
            data.class,
            data.qr_code
          ).run();

          // Sync to Google Sheets
          await syncToGoogleSheets(env, 'students', data);

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (err) {
          if (err.message.includes('UNIQUE')) {
            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Student already registered' 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw err;
        }
      }

      // Mark Attendance
      if (path === '/api/mark_attendance' && request.method === 'POST') {
        const data = await request.json();
        
        try {
          await env.DB.prepare(
            'INSERT INTO attendance (student_id, student_name, class, attendance_date, attendance_time) VALUES (?, ?, ?, ?, ?)'
          ).bind(
            data.student_id,
            data.student_name,
            data.class,
            data.attendance_date,
            data.attendance_time
          ).run();

          // Sync to Google Sheets
          await syncToGoogleSheets(env, 'attendance', data);

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (err) {
          if (err.message.includes('UNIQUE')) {
            return new Response(JSON.stringify({ 
              success: false, 
              message: 'Attendance already marked for today' 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw err;
        }
      }

      // Get Students
      if (path === '/api/get_students' && request.method === 'GET') {
        const classFilter = url.searchParams.get('class');
        
        let query = 'SELECT * FROM students';
        let stmt;
        
        if (classFilter && classFilter !== 'all') {
          stmt = env.DB.prepare(query + ' WHERE class = ?').bind(classFilter);
        } else {
          stmt = env.DB.prepare(query);
        }
        
        const result = await stmt.all();
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: result.results 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get Attendance Records
      if (path === '/api/get_attendance_records' && request.method === 'GET') {
        const date = url.searchParams.get('date');
        
        const result = await env.DB.prepare(
          'SELECT * FROM attendance WHERE attendance_date = ? ORDER BY attendance_time DESC'
        ).bind(date).all();
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: result.results 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get Statistics
      if (path === '/api/get_statistics' && request.method === 'GET') {
        const date = url.searchParams.get('date');
        
        const totalStudents = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM students'
        ).first();
        
        const presentStudents = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM attendance WHERE attendance_date = ?'
        ).bind(date).first();
        
        const total = totalStudents.count;
        const present = presentStudents.count;
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
      }

      // Remove Student
      if (path === '/api/remove_student' && request.method === 'POST') {
        const data = await request.json();
        
        await env.DB.prepare(
          'DELETE FROM students WHERE student_id = ?'
        ).bind(data.student_id).run();
        
        await env.DB.prepare(
          'DELETE FROM attendance WHERE student_id = ?'
        ).bind(data.student_id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
      
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
};

// Google Sheets Sync Function
async function syncToGoogleSheets(env, sheetType, data) {
  try {
    // You'll need to set up Google Sheets API credentials
    // For now, this is a placeholder that would use Google Sheets API
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEETS_ID}/values/${sheetType}!A:Z:append?valueInputOption=USER_ENTERED`;
    
    let row;
    if (sheetType === 'students') {
      row = [data.student_id, data.student_name, data.class, new Date().toISOString()];
    } else {
      row = [data.student_id, data.student_name, data.class, data.attendance_date, data.attendance_time];
    }
    
    // This requires OAuth2 token - see setup instructions below
    // For production, use service account credentials
    
    console.log('Would sync to Google Sheets:', row);
  } catch (err) {
    console.error('Google Sheets sync failed:', err);
    // Don't fail the main request if sheets sync fails
  }
}