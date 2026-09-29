import re
with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

render_add = """
  import('./challenge.js').then(m => m.getAllChallenges()).then(challenges => {
    const selects = document.querySelectorAll('.challenge-select');
    selects.forEach(sel => {
      const current = sel.value;
      const active = challenges.filter(c => c.status !== 'perdido' && c.status !== 'retiro_fallido');
      // To help the user distinguish, we show the firma, status, and maybe id
      sel.innerHTML = '<option value="">Ninguno</option>' + challenges.map(c => 
        `<option value="${c.id}">${c.nombre || c.firma} (${c.type}) - ${c.status.replace('_', ' ')}</option>`
      ).join('');
      sel.value = current;
    });
  }).catch(()=>{});
"""

# replace the end of renderAll
content = content.replace("renderTagCloud('edit-tag-cloud', 'edit-tags-input');\n}", "renderTagCloud('edit-tag-cloud', 'edit-tags-input');\n" + render_add + "}")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("fixed challenge select injection")
