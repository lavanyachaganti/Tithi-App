const axios = require('axios');
(async () => {
  try {
    const email = `autotest${Date.now()}@example.com`;
    console.log('Registering', email);
    const reg = await axios.post('http://127.0.0.1:5000/api/register', {
      name: 'Auto Tester',
      email,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    }, { headers: { 'Content-Type': 'application/json' } });

    console.log('REGISTER', reg.status, reg.data);

    const login = await axios.post('http://127.0.0.1:5000/api/login', {
      email,
      password: 'Password123!'
    }, { headers: { 'Content-Type': 'application/json' } });

    console.log('LOGIN', login.status, login.data);
  } catch (err) {
    console.error('ERROR', err.message);
    if (err.response) {
      console.error('RESPONSE', err.response.status, err.response.data);
    }
  }
})();