const docIds = ['69ed6c662a9df0df194974bf', '69ed6c662a9df0df194974c0', '69ed6c662a9df0df194974c1'];
async function run() {
  for (const id of docIds) {
    try {
      const res = await fetch(`http://localhost:3001/api/prescriptions/extraction/${id}`, {
        headers: { Authorization: `Bearer dev-bypass-token` }
      });
      console.log(`Doc ${id}: status ${res.status}`);
      const json = await res.json();
      console.log(json);
    } catch (e) {
      console.log(e.message);
    }
  }
}
run();
