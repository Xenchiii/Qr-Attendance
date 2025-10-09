export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Check database binding
      if (url.pathname.startsWith('/api/') && !env.DB) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Database not bound'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Register Student
      if (url.pathname === '/api/student_attendance' && request.method === 'POST') {
        const data = await request.json();
        
        await env.DB.prepare(
          'INSERT INTO students (student_id, student_name, class, qr_code) VALUES (?, ?, ?, ?)'
        ).bind(data.student_id, data.student_name, data.class, data.qr_code).run();

        return new Response(JSON.stringify({
          success: true,
          message: 'Student registered successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Mark Attendance (Present)
      if (url.pathname === '/api/mark_attendance' && request.method === 'POST') {
        const data = await request.json();
        
        try {
          await env.DB.prepare(
            'INSERT INTO attendance_records (student_id, student_name, class, attendance_date, attendance_time, status) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(
            data.student_id,
            data.student_name,
            data.class,
            data.attendance_date,
            data.attendance_time,
            'present'
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
      }

      // Mark Absent - NEW ENDPOINT
      if (url.pathname === '/api/mark_absent' && request.method === 'POST') {
        const data = await request.json();
        
        try {
          await env.DB.prepare(
            'INSERT INTO attendance_records (student_id, student_name, class, attendance_date, attendance_time, status) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(
            data.student_id,
            data.student_name,
            data.class,
            data.attendance_date,
            new Date().toLocaleTimeString(),
            'absent'
          ).run();

          return new Response(JSON.stringify({
            success: true,
            message: 'Student marked as absent'
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
      }

      // Get Students
      if (url.pathname === '/api/get_students' && request.method === 'GET') {
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
      }

      // Get Attendance Records
      if (url.pathname === '/api/get_attendance_records' && request.method === 'GET') {
        const date = url.searchParams.get('date');
        
        const result = await env.DB.prepare(
          'SELECT * FROM attendance_records WHERE attendance_date = ? ORDER BY attendance_time DESC'
        ).bind(date).all();
        
        return new Response(JSON.stringify({
          success: true,
          data: result.results || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get Statistics
      if (url.pathname === '/api/get_statistics' && request.method === 'GET') {
        const date = url.searchParams.get('date');
        
        const totalStudents = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM students'
        ).first();
        
        const presentStudents = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM attendance_records WHERE attendance_date = ? AND status = "present"'
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
      }

      // Remove Student
      if (url.pathname === '/api/remove_student' && request.method === 'POST') {
        const data = await request.json();
        
        await env.DB.prepare('DELETE FROM students WHERE student_id = ?').bind(data.student_id).run();
        await env.DB.prepare('DELETE FROM attendance_records WHERE student_id = ?').bind(data.student_id).run();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Student removed successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // API endpoint not found
      if (url.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({
          success: false,
          message: 'API endpoint not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({
        success: false,
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Serve static files
    return env.ASSETS.fetch(request);
  }
};
