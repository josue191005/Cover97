/* ======================================================
   1. CONFIGURACIÓN
   ====================================================== */
const API_URL = "https://script.google.com/macros/s/AKfycbw28t4GgoY5tv1k48G3XQ_sUW4we2Y-UeSbpAzAbvOMeDBOAutJmHMp1Z-_Z1P_pnoS/exec";

/* ======================================================
   2. REFERENCIAS AL DOM
   ====================================================== */
const form = document.querySelector(".booking-form");
const dayInput = document.getElementById("day");
const timeInput = document.getElementById("time");
const daysList = document.getElementById("days-list");
const hoursList = document.getElementById("hours-list");
const btnSubmit = document.querySelector(".btn-primary");
const nameInput = document.getElementById("name");
const whatsappInput = document.getElementById("whatsapp");

// Tarjetas de servicio
const serviceCards = document.querySelectorAll(".service-card");

let slots = [];
let selectedDay = null;

/* ======================================================
   3. EVENTOS DE SELECCIÓN DE SERVICIOS
   ====================================================== */
serviceCards.forEach(card => {
  card.addEventListener("click", () => {
    card.classList.toggle("selected");
  });
});

/* ======================================================
   4. CARGA DE DATOS Y FECHAS
   ====================================================== */
function loadAvailability() {
  fetch(API_URL)
    .then(res => res.json())
    .then(data => { slots = data; })
    .catch(err => console.error("Error cargando datos:", err));
}
loadAvailability();

function formatDay(dateStr) {
  const [day, month, year] = dateStr.split("/");
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
}

// Mostrar lista de días
dayInput.addEventListener("click", () => {
  renderDays();
  daysList.classList.toggle("hidden");
  hoursList.classList.add("hidden");
});

function renderDays() {
  daysList.innerHTML = "";
  const diasUnicos = [...new Set(slots.map(s => s.fecha))];
  
  diasUnicos.sort((a, b) => {
    const [da, ma, ya] = a.split("/").map(Number);
    const [db, mb, yb] = b.split("/").map(Number);
    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
  });

  diasUnicos.forEach(day => {
    const btn = document.createElement("button");
    btn.type = "button";
    const fechaTexto = formatDay(day);
    btn.textContent = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
    
    btn.addEventListener("click", () => {
      selectedDay = day;
      dayInput.value = btn.textContent;
      timeInput.value = "";
      daysList.classList.add("hidden");
    });
    daysList.appendChild(btn);
  });
}

// Mostrar lista de horas
timeInput.addEventListener("click", () => {
  if (!selectedDay) { 
    Swal.fire({ icon: 'info', text: 'Primero selecciona un día', confirmButtonColor: '#333' });
    return; 
  }
  renderHours(selectedDay);
  hoursList.classList.toggle("hidden");
});

function renderHours(day) {
  hoursList.innerHTML = "";
  const availableHours = slots.filter(s => s.fecha === day);

  if (availableHours.length === 0) {
    hoursList.innerHTML = "<p style='color:white; padding:5px'>Sin horarios disponibles</p>";
    return;
  }

  availableHours.forEach(s => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = s.hora;
    btn.addEventListener("click", () => {
      timeInput.value = s.hora;
      hoursList.classList.add("hidden");
    });
    hoursList.appendChild(btn);
  });
}

/* ======================================================
   5. ENVÍO DEL FORMULARIO (CON SWEETALERT2)
   ====================================================== */
/* ======================================================
   5. ENVÍO DEL FORMULARIO (MODO DIRECTO A WHATSAPP)
   ====================================================== */
form.addEventListener("submit", e => {
  e.preventDefault();

  // A) Validaciones con Alertas Bonitas
  if (!selectedDay || !timeInput.value) { 
    Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Por favor selecciona día y hora.', confirmButtonColor: '#f5c542' });
    return; 
  }
  
  const nombreCliente = nameInput.value.trim();
  const wspCliente = whatsappInput.value.trim();

  if (nombreCliente === "") { 
    Swal.fire({ icon: 'warning', text: 'Por favor escribe tu nombre.', confirmButtonColor: '#f5c542' })
      .then(() => nameInput.focus());
    return; 
  }
  if (wspCliente.length < 9) { 
    Swal.fire({ icon: 'warning', text: 'El número de WhatsApp no parece válido.', confirmButtonColor: '#f5c542' })
      .then(() => whatsappInput.focus());
    return; 
  }

  // B) Recolectar Servicios
  const serviciosSeleccionados = Array.from(document.querySelectorAll(".service-card.selected"))
    .map(card => card.querySelector(".service-name").textContent.trim())
    .join(", ");

  // C) Preparar Envío
  const originalBtnText = btnSubmit.textContent;
  btnSubmit.textContent = "Procesando...";
  btnSubmit.disabled = true;

  const payload = {
    fecha: selectedDay,
    hora: timeInput.value,
    nombre: nombreCliente,
    whatsapp: wspCliente,
    servicios: serviciosSeleccionados
  };

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, 
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(response => {
    if (response.status === "success") {

      // 1. Preparar Link de WhatsApp
      // Usamos dayInput.value para que diga "Lunes 5..." en vez de "05/01/2026"
      const mensajeWsp = `Hola Cover 97, soy ${nombreCliente}. Acabo de reservar para el ${dayInput.value} a las ${timeInput.value}. Servicios: ${serviciosSeleccionados || "Corte"}.`;
      
      const tuNumeroNegocio = "51989435125"; 
      const urlWsp = `https://wa.me/${tuNumeroNegocio}?text=${encodeURIComponent(mensajeWsp)}`;

      // 2. ABRIR WHATSAPP DE INMEDIATO (Sin preguntar)
      window.open(urlWsp, "_blank");

      // 3. Feedback visual (Alerta que se cierra sola en 3 seg)
      Swal.fire({
        icon: 'success',
        title: '¡Reserva Enviada!',
        text: 'Redirigiendo a WhatsApp para confirmar...',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        background: '#1c1c1c',
        color: '#fff'
      });

      // 4. Limpieza
      form.reset();
      selectedDay = null;
      document.querySelectorAll(".service-card").forEach(c => c.classList.remove("selected"));
      loadAvailability();

    } else {
      Swal.fire({ icon: 'error', title: 'Oops...', text: response.message, confirmButtonColor: '#d33' });
    }
  })
  .catch(err => {
    console.error(err);
    Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No pudimos conectar con el servidor.', confirmButtonColor: '#d33' });
  })
  .finally(() => {
    btnSubmit.textContent = originalBtnText;
    btnSubmit.disabled = false;
  });
});
/* ======================================================
   6. CARRUSEL
   ====================================================== */
const servicesList = document.querySelector(".services-list");
const arrows = document.querySelectorAll(".nav-arrow");
if (servicesList && arrows.length === 2) {
  arrows[0].addEventListener("click", () => servicesList.scrollBy({ left: -150, behavior: "smooth" }));
  arrows[1].addEventListener("click", () => servicesList.scrollBy({ left: 150, behavior: "smooth" }));
}
