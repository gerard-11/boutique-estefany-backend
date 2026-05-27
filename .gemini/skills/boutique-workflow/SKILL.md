---
name: boutique-workflow
description: Reglas de negocio y arquitectura del backend de Boutique Estefany (NestJS + Prisma). Úsalo cuando necesites recordar cómo funcionan las compras, apartados, préstamos, y los niveles/colores de los clientes en este sistema.
---

# Boutique Estefany - Flujo de Trabajo y Reglas de Negocio

Este documento contiene la lógica de negocio acordada para la aplicación de gestión de la Boutique. El backend está construido en **NestJS** y usa **Prisma ORM** con **PostgreSQL**.

## 1. Tipos de Usuarios (Autenticación)
- **ADMIN:** Solo existe 1 (aunque puede iniciar sesión en múltiples dispositivos). Tiene control total sobre el inventario, aprueba solicitudes y gestiona clientes.
- **CLIENT (Cliente):** Tiene un nivel (Bronce, Plata, Oro) decidido manualmente por el admin. Reciben notificaciones Push (FCM). 
- **GUEST (Público):** Pueden ver el catálogo de productos (Stock público).

## 2. Tipos de Transacciones
La aplicación requiere el consentimiento del cliente (Máquina de estados):
- **Contado:** Compra directa.
- **Crédito Semanal:** El admin selecciona al cliente -> El estado de la transacción es `PENDING_APPROVAL`. El cliente recibe una notificación en su App. Cuando el cliente acepta, pasa a `ACTIVE`.
- **Apartados:** El cliente reserva una prenda. Por defecto dura 1 mes.
  - *Cron Job (NestJS):* Revisa los apartados vencidos.
  - *Extensión:* Se permite dar una prórroga manual de 1 semana más. Si no se cumple, el stock regresa a disponible y se cancela.
- **Préstamos:** La prenda cambia a estado prestado (`ON_LOAN`). Cuando se devuelve el préstamo, el admin escanea de nuevo y el cliente recibe notificación de que su préstamo ha sido devuelto satisfactoriamente.

## 3. Dinámica de Clientes y Deudas
- **Colores de Status (Frontend/Cálculo en Vuelo):**
  - Se definen según el tiempo transcurrido desde el último abono (Verde, Amarillo, Rojo).
  - *Si es Rojo:* El admin recibe un recordatorio y tiene un botón para abrir WhatsApp con un mensaje preescrito para enviarlo al cliente moroso.
- **Niveles de Cliente:** Bronce, Plata, Oro. Esto se almacena en la base de datos de manera persistente (`Level` Enum) y se cambia a criterio del Admin. Al cambiarlo, el cliente es notificado (FCM).

## 4. Estructura de Inventario y Categorías
- **Jerarquía dinámica:** Para evitar tener tipos estáticos o harcodeados y permitir expansión futura.
  - `Department` (ej. Dama, Caballero, Unisex)
  - `Category` (ej. Zapatos, Jeans, Sudaderas, Perfumes). 
- El ingreso de mercancía se hace **escaneando el código de barras** con la cámara del dispositivo Admin.

## 5. Pedidos a Domicilio (NUEVO)
- Los clientes pueden solicitar prendas a domicilio (ya que es un área local).
- Se genera un `DeliveryRequest`. El admin revisa y puede Aceptar o Rechazar.

## 6. Sincronización Offline y Base de Datos
- El administrador puede trabajar sin internet (Offline).
- NestJS recibirá las peticiones de sincronización en lote una vez que recupere la conexión.
- No hay problemas de conflicto de admins concurrentes modificando el mismo cliente, ya que **solo hay un Admin**.

## 7. Estado del Proyecto (Bitácora)
- **[2026-05-26] Infraestructura Base:** Docker con PostgreSQL y Prisma 7 configurados.
- **[2026-05-26] Autenticación:** Firebase Admin SDK integrado, Auto-registro de usuarios y asignación de ADMIN al primer usuario.
- **[2026-05-26] Seguridad:** ValidationPipe global activado y DTOs de entrada/salida implementados para el perfil de usuario.

**Próximo paso:** Iniciar el Módulo de Catálogo (Departamentos, Categorías y Productos).

