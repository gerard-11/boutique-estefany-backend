# Hoja de Ruta: Integración React Native (Boutique Estefany)

Este documento define cómo la App Mobile debe interactuar con el Backend para mantener la integridad de las reglas de negocio.

## 1. Conexión y Seguridad
*   **Protocolo:** REST API.
*   **Autenticación:** Firebase Auth. 
    *   La App obtiene el `IdToken` de Firebase.
    *   Se envía en cada petición en el Header: `Authorization: Bearer <TOKEN>`.
*   **Roles:** El Frontend debe condicionar las vistas. El Backend rechazará cualquier acción no permitida aunque el botón sea visible.

## 2. Reglas de Oro del Frontend (Business Logic)

### A. El Semáforo de Clientes (Cálculo en Vuelo)
No pidas un "color" al servidor. El servidor te da el perfil enriquecido (`GET /users/profile/:id`) y tú aplicas la lógica:
*   **VERDE:** Último abono hace <= 7 días.
*   **AMARILLO:** Último abono hace > 7 días.
*   **ROJO:** Último abono hace > 30 días.

### B. Cálculo de Cuotas Semanales
El sistema sugiere, pero el Admin puede sobreescribir.
*   Lógica base: `$200` base hasta `$1000`. +`$50` por cada bloque de `$500` adicionales.

### C. Alertas de Reserva Suave (Soft Reservation)
Al escanear un producto para venta física (`GET /products/barcode/:code`):
*   Si el JSON contiene `softReservationAlert`, el Frontend **DEBE** mostrar un modal de advertencia antes de proceder con la venta.

## 3. Roadmap de Implementación (Fases)

### Fase 1: Cimientos (Auth & Catálogo)
*   Login con Firebase.
*   Explorador de productos (público para GUEST, con costos ocultos para CLIENT).
*   Escaneo de código de barras (Cámara).

### Fase 2: El Panel del Admin (Dashboard & Inventario)
*   Consumo del `DashboardReportModule`.
*   Módulo de Ajuste Manual (Mermas y Entradas).
*   Gestión de Niveles de Cliente.

### Fase 3: Transacciones y Cobranza
*   Creación de Ventas (Contado/Crédito).
*   Motor de Devoluciones (Algoritmo de Reparto).
*   Registro de Pagos Semanales.

### Fase 4: Fidelización (Wishlist & Delivery)
*   Solicitud de Pedidos a Domicilio.
*   Rastreo de Wishlist para el cliente.

## 4. Modo de Trabajo (Mentoría)
Para cada pantalla que vayamos a construir en React Native, seguiremos este flujo:
1.  **Diseño Lógico:** Definimos qué datos necesita la pantalla y qué estados (Loading, Error, Success).
2.  **Estrategia de UI:** Te daré los componentes base necesarios.
3.  **Implementación:** Tú escribes el código, yo audito que la lógica de negocio se cumpla.
4.  **Validación:** Pruebas de conectividad con el Backend.

---

**¡Ojo con React Native!** Al ser mobile, piensa siempre en "Offline First". Si el Admin pierde internet en la tienda, debe poder seguir escaneando.
