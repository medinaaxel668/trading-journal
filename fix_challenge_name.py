import re
with open('challenge.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("type: String(data.type || 'simulado').trim(),", "nombre: String(data.nombre || '').trim(),\n    type: String(data.type || 'simulado').trim(),")
content = content.replace("type: String(data.type || existing.type).trim(),", "nombre: String(data.nombre || existing.nombre).trim(),\n    type: String(data.type || existing.type).trim(),")

with open('challenge.js', 'w', encoding='utf-8') as f:
    f.write(content)


with open('challenge-ui.js', 'r', encoding='utf-8') as f:
    content2 = f.read()

# Add Nombre to the form (before firma)
form_nombre = '<div><label class="mode-stat-label">Nombre del Challenge (opcional)</label><input name="nombre" class="form-input" type="text" placeholder="Ej: Fase 1 FTMO" /></div>'
content2 = content2.replace('<div><label class="mode-stat-label">Firma</label>', form_nombre + '\n              <div><label class="mode-stat-label">Firma</label>')

# Populate form in openEditModal
edit_nombre = "form.querySelector('[name=\"nombre\"]').value = c.nombre || '';"
content2 = content2.replace("form.querySelector('[name=\"firma\"]').value = c.firma || '';", edit_nombre + "\n    form.querySelector('[name=\"firma\"]').value = c.firma || '';")

# Display in cards (c.nombre || c.firma)
content2 = content2.replace('<h4 style="margin:0;color:var(--text-main)">${c.firma}</h4>', '<h4 style="margin:0;color:var(--text-main)">${c.nombre || c.firma} <span style="font-size:12px;color:var(--text-sec);font-weight:normal">(${c.firma})</span></h4>')

with open('challenge-ui.js', 'w', encoding='utf-8') as f:
    f.write(content2)

print("fixed challenge name")
