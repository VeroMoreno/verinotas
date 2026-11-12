// VeriNotas: dos listas (Pendientes y Me gustaría) y lo cumplido.
// Todo vive en localStorage del propio iPhone: sin cuentas, sin servidor, sin red.
(function () {
  'use strict';

  const CLAVE = 'verinotas.v1.cosas';
  const $ = (sel) => document.querySelector(sel);

  /** @type {{id:string, texto:string, lista:'bandeja'|'gustaria', creada:string, cumplida:string|null}[]} */
  // ?demo enseña un ejemplo sin tocar tus datos; ?tema=claro|oscuro fuerza el tema (lo lee index.html).
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');

  let cosas = DEMO ? ejemplo() : cargar();
  let deshacer = null;
  let temporizador = null;

  function cargar() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      return Array.isArray(datos) ? datos.filter(valida) : [];
    } catch {
      return [];
    }
  }

  function ejemplo() {
    const ayer = new Date(Date.now() - 864e5).toISOString();
    const ahora = new Date().toISOString();
    const c = (id, texto, lista, cumplida = null) => ({ id, texto, lista, creada: ahora, cumplida });
    return [
      c('a', 'Aprender cerámica', 'gustaria'),
      c('b', 'Pasar un día en la playa', 'gustaria'),
      c('c', 'Leer un libro entero', 'gustaria', ahora),
      c('d', 'Renovar DNI (cita previa)', 'bandeja'),
      c('e', 'Comprar regalo de cumple', 'bandeja', ahora),
      c('f', 'Llamar al pediatra', 'bandeja', ayer),
    ];
  }

  function valida(c) {
    return c && typeof c.id === 'string' && typeof c.texto === 'string' &&
      (c.lista === 'bandeja' || c.lista === 'gustaria');
  }

  function guardar() {
    if (DEMO) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(cosas));
    } catch {
      avisar('No se ha podido guardar en este dispositivo');
    }
  }

  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const hoy = () => new Date().toISOString();
  let recienHecha = null;
  let verTodas = false;
  const RECIENTES = 5;

  // El día en que se marcó como cumplida: «hoy», «ayer», «10 nov» o «10 nov 2025».
  function fechaCumplida(iso) {
    const d = new Date(iso);
    const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5);
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'ayer';
    const mismoAño = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString('es-ES', mismoAño ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Cambia el estado guardando una copia para poder deshacer.
  function cambiar(mensaje, fn) {
    const antes = JSON.stringify(cosas);
    fn();
    guardar();
    pintar();
    if (mensaje) {
      deshacer = () => { cosas = JSON.parse(antes); guardar(); pintar(); };
      avisar(mensaje, true);
    }
  }

  function avisar(texto, conDeshacer) {
    $('#aviso-texto').textContent = texto;
    $('#deshacer').hidden = !conDeshacer;
    $('#aviso').hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { $('#aviso').hidden = true; deshacer = null; }, 5000);
  }

  function boton(clase, simbolo, etiqueta, accion) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = clase;
    b.textContent = simbolo;
    b.setAttribute('aria-label', etiqueta);
    b.title = etiqueta;
    b.addEventListener('click', accion);
    return b;
  }

  function fila(c) {
    const li = document.createElement('li');
    const cumplida = Boolean(c.cumplida);
    li.dataset.id = c.id;
    if (cumplida) li.className = 'hecha';
    if (c.id === recienHecha) li.classList.add('ahora');
    if (!cumplida) li.append(asa(li));

    // Al cumplirla se ve tachada un momento en su sitio y luego pasa a Cumplidas.
    li.append(boton('circulo', '', cumplida ? 'Volver a pendiente' : 'Marcar como hecha', (e) => {
      if (cumplida) {
        cambiar('Vuelve a su lista', () => { c.cumplida = null; });
        return;
      }
      e.currentTarget.disabled = true;
      li.classList.add('hecha', 'ahora');
      setTimeout(() => cambiar('¡Hecho! ✦ Está en Cumplidas', () => {
        c.cumplida = hoy();
        recienHecha = c.id;
      }), 700);
    }));

    const txt = document.createElement('span');
    txt.className = 'txt';
    txt.textContent = c.texto;
    if (!cumplida) txt.addEventListener('click', () => editar(txt, c));
    li.append(txt);

    if (cumplida) {
      const cuando = document.createElement('time');
      cuando.className = 'cuando';
      cuando.dateTime = c.cumplida;
      cuando.textContent = fechaCumplida(c.cumplida);
      li.append(cuando);
    }

    const acciones = document.createElement('span');
    acciones.className = 'acciones';
    if (!cumplida && c.lista === 'bandeja') {
      acciones.append(boton('accion a-gustaria', '✦', 'Pasar a Me gustaría', () =>
        cambiar('Pasada a Me gustaría', () => { c.lista = 'gustaria'; })));
    }
    acciones.append(boton('accion', '×', 'Quitar', () =>
      cambiar('Quitada', () => { cosas = cosas.filter((x) => x.id !== c.id); })));
    li.append(acciones);
    return li;
  }

  // ── Arrastrar para ordenar (Me gustaría y Pendientes) ──
  // Con el dedo o el ratón desde el asa ⠿; con el teclado, flechas arriba y abajo sobre el asa.
  const ICONO_ASA = '<svg viewBox="0 0 10 16" aria-hidden="true"><circle cx="2.5" cy="3" r="1.5"/><circle cx="7.5" cy="3" r="1.5"/><circle cx="2.5" cy="8" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/><circle cx="2.5" cy="13" r="1.5"/><circle cx="7.5" cy="13" r="1.5"/></svg>';

  function asa(li) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'asa';
    b.setAttribute('aria-label', 'Mover (flechas arriba y abajo)');
    b.innerHTML = ICONO_ASA;
    b.addEventListener('pointerdown', (e) => empezarArrastre(e, li));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const otro = e.key === 'ArrowUp' ? li.previousElementSibling : li.nextElementSibling;
      if (!otro) return;
      li.parentElement.insertBefore(li, e.key === 'ArrowUp' ? otro : otro.nextElementSibling);
      guardarOrden(li.parentElement, li.dataset.id);
    });
    return b;
  }

  function empezarArrastre(e, li) {
    if (e.button !== 0) return;
    e.preventDefault();
    const ul = li.parentElement;
    const asaEl = e.currentTarget;
    const arriba = li.getBoundingClientRect().top;
    const agarre = e.clientY - arriba;
    let y = e.clientY;
    let auto = 0;
    try { asaEl.setPointerCapture(e.pointerId); } catch {}
    li.classList.add('arrastrando');
    document.body.classList.add('moviendo');

    const colocar = () => {
      // Se recoloca en el hueco que le toca y se dibuja pegado al dedo.
      const otros = [...ul.children].filter((x) => x !== li);
      const antes = otros.find((x) => {
        const r = x.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      if (antes) { if (li.nextElementSibling !== antes) ul.insertBefore(li, antes); }
      else if (ul.lastElementChild !== li) ul.append(li);
      li.style.transform = '';
      const natural = li.getBoundingClientRect().top;
      li.style.transform = `translateY(${y - agarre - natural}px)`;
    };
    const desplazar = () => {
      const borde = 70;
      const paso = y < borde ? -10 : y > innerHeight - borde ? 10 : 0;
      if (paso) { scrollBy(0, paso); colocar(); }
      auto = requestAnimationFrame(desplazar);
    };
    const mover = (ev) => { y = ev.clientY; colocar(); };
    const soltar = () => {
      cancelAnimationFrame(auto);
      asaEl.removeEventListener('pointermove', mover);
      asaEl.removeEventListener('pointerup', soltar);
      asaEl.removeEventListener('pointercancel', soltar);
      li.style.transform = '';
      li.classList.remove('arrastrando');
      document.body.classList.remove('moviendo');
      guardarOrden(ul);
    };
    asaEl.addEventListener('pointermove', mover);
    asaEl.addEventListener('pointerup', soltar);
    asaEl.addEventListener('pointercancel', soltar);
    auto = requestAnimationFrame(desplazar);
  }

  // El orden de la lista en pantalla pasa a ser el orden guardado.
  function guardarOrden(ul, enfocar) {
    const ids = [...ul.children].map((x) => x.dataset.id).filter(Boolean);
    const porId = new Map(cosas.map((c) => [c.id, c]));
    const enLista = new Set(ids);
    let i = 0;
    const nuevo = cosas.map((c) => (enLista.has(c.id) ? porId.get(ids[i++]) : c));
    if (nuevo.every((c, k) => c === cosas[k])) return;
    cosas = nuevo;
    guardar();
    pintar();
    if (enfocar) document.querySelector(`[data-id="${enfocar}"] .asa`)?.focus();
  }

  function editar(txt, c) {
    if (txt.querySelector('input')) return;
    const input = document.createElement('input');
    input.value = c.texto;
    input.enterKeyHint = 'done';
    input.setAttribute('aria-label', 'Editar');
    txt.textContent = '';
    txt.append(input);
    input.focus();
    let hecho = false;
    const terminar = (guardarlo) => {
      if (hecho) return;
      hecho = true;
      const nuevo = input.value.trim();
      if (guardarlo && nuevo && nuevo !== c.texto) cambiar(null, () => { c.texto = nuevo; });
      else pintar();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); terminar(true); }
      if (e.key === 'Escape') terminar(false);
    });
    input.addEventListener('blur', () => terminar(true));
  }

  function pintarLista(nombre, items, vacio) {
    const ul = document.querySelector(`[data-lista="${nombre}"]`);
    ul.replaceChildren();
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'vacio';
      li.textContent = vacio;
      ul.append(li);
      return;
    }
    items.forEach((c) => ul.append(fila(c)));
  }

  // Cada cosa está en un solo sitio: pendiente en su lista o cumplida en Cumplidas.
  function pintar() {
    const pendientes = (lista) => cosas.filter((c) => c.lista === lista && !c.cumplida);
    const gustaria = pendientes('gustaria');
    const bandeja = pendientes('bandeja');
    const cumplidas = cosas.filter((c) => c.cumplida).sort((a, b) => b.cumplida.localeCompare(a.cumplida));

    $('#n-gustaria').textContent = gustaria.length;
    $('#n-bandeja').textContent = bandeja.length;
    $('#n-cumplidas').textContent = cumplidas.length;

    pintarLista('gustaria', gustaria, 'Nada todavía. ¿Qué te apetecería hacer?');
    pintarLista('bandeja', bandeja, 'Nada pendiente. Bien.');
    pintarLista('cumplidas', verTodas ? cumplidas : cumplidas.slice(0, RECIENTES), 'Aquí irá lo que vayas cumpliendo.');

    const mas = $('#ver-todas');
    mas.hidden = cumplidas.length <= RECIENTES;
    mas.textContent = verTodas ? 'Ver solo las últimas' : `Ver todas (${cumplidas.length})`;
    recienHecha = null;
  }

  // Plegar tarjetas tocando el título. «Me gustaría» abre siempre desplegada;
  // Pendientes y Cumplidas recuerdan cómo las dejaste.
  const CLAVE_PLEGADAS = 'verinotas.v1.plegadas';
  let plegadas = [];
  try { plegadas = JSON.parse(localStorage.getItem(CLAVE_PLEGADAS) || '[]'); } catch {}

  function plegar(tarjeta, plegada) {
    tarjeta.classList.toggle('plegada', plegada);
    tarjeta.querySelector('h2').setAttribute('aria-expanded', String(!plegada));
    if (!('recordar' in tarjeta.dataset) || DEMO) return;
    plegadas = plegadas.filter((id) => id !== tarjeta.id);
    if (plegada) plegadas.push(tarjeta.id);
    try { localStorage.setItem(CLAVE_PLEGADAS, JSON.stringify(plegadas)); } catch {}
  }

  document.querySelectorAll('[data-plegable]').forEach((tarjeta) => {
    const h2 = tarjeta.querySelector('h2');
    h2.setAttribute('role', 'button');
    h2.tabIndex = 0;
    h2.insertAdjacentHTML('beforeend', '<span class="flecha" aria-hidden="true"></span>');
    const alternar = () => plegar(tarjeta, !tarjeta.classList.contains('plegada'));
    h2.addEventListener('click', alternar);
    h2.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); }
    });
    tarjeta.classList.toggle('plegada', 'recordar' in tarjeta.dataset && plegadas.includes(tarjeta.id));
    h2.setAttribute('aria-expanded', String(!tarjeta.classList.contains('plegada')));
  });

  $('#ver-todas').addEventListener('click', () => { verTodas = !verTodas; pintar(); });

  // Apuntar
  $('#apuntar').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#texto');
    const texto = input.value.trim();
    if (!texto) return;
    const lista = new FormData(e.target).get('lista');
    cambiar(null, () => {
      cosas.unshift({ id: nuevoId(), texto, lista, creada: hoy(), cumplida: null });
    });
    input.value = '';
    input.focus(); // el teclado se queda abierto para apuntar la siguiente
  });

  // Contadores: llevan a su tarjeta
  document.querySelectorAll('[data-ir]').forEach((b) =>
    b.addEventListener('click', () => {
      const destino = document.getElementById(b.dataset.ir);
      if (destino.classList.contains('plegada')) plegar(destino, false);
      destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

  $('#deshacer').addEventListener('click', () => {
    if (deshacer) deshacer();
    deshacer = null;
    $('#aviso').hidden = true;
  });

  // Copia de seguridad: un .json que se guarda en Archivos
  $('#exportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, cosas }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `verinotas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#importar').addEventListener('change', async (e) => {
    const fichero = e.target.files[0];
    e.target.value = '';
    if (!fichero) return;
    try {
      const datos = JSON.parse(await fichero.text());
      const lista = (Array.isArray(datos) ? datos : datos.cosas || []).filter(valida);
      cambiar(`Copia recuperada: ${lista.length} cosas`, () => { cosas = lista; });
    } catch {
      avisar('Ese fichero no es una copia de VeriNotas');
    }
  });

  // Sol y luna: se recuerda la elección; sin elegir, sigue al iPhone.
  function pintarTema() {
    const claro = document.documentElement.dataset.tema === 'claro';
    $('#tema').setAttribute('aria-label', claro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#141219');
  }
  $('#tema').addEventListener('click', () => {
    const nuevo = document.documentElement.dataset.tema === 'claro' ? 'oscuro' : 'claro';
    document.documentElement.dataset.tema = nuevo;
    try { if (!DEMO) localStorage.setItem('verinotas.v1.tema', nuevo); } catch {}
    pintarTema();
  });
  pintarTema();

  // ── El nombre del saludo: lo pone cada persona en su móvil; sin nombre, «¡Hola!» ──
  const CLAVE_NOMBRE = 'verinotas.v1.nombre';
  let nombre = '';
  try { nombre = DEMO ? '' : localStorage.getItem(CLAVE_NOMBRE) || ''; } catch {}

  function pintarNombre() {
    $('#hola').textContent = nombre ? `Hola, ${nombre}` : '¡Hola!';
    $('#pista').hidden = Boolean(nombre);
  }

  function editarNombre() {
    const hola = $('#hola');
    if (hola.querySelector('input')) return;
    const input = document.createElement('input');
    input.value = nombre;
    input.placeholder = 'Tu nombre';
    input.maxLength = 24;
    input.enterKeyHint = 'done';
    input.setAttribute('aria-label', 'Tu nombre');
    hola.textContent = 'Hola, ';
    hola.append(input);
    input.focus();
    let hecho = false;
    const terminar = () => {
      if (hecho) return;
      hecho = true;
      nombre = input.value.trim();
      try { if (!DEMO) localStorage.setItem(CLAVE_NOMBRE, nombre); } catch {}
      pintarNombre();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); terminar(); }
    });
    input.addEventListener('blur', terminar);
  }

  $('#hola').addEventListener('click', editarNombre);
  $('#hola').addEventListener('keydown', (e) => {
    if (e.target !== e.currentTarget) return; // el Enter del propio campo no lo vuelve a abrir
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editarNombre(); }
  });
  pintarNombre();

  $('#fecha').textContent = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  pintar();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
