---
name: boutique-workflow
description: Reglas de negocio y arquitectura del backend de Boutique Estefany (NestJS + Prisma). Úsalo cuando necesites recordar cómo funcionan las compras, apartados, préstamos, y los niveles/colores de los clientes en este sistema.
---

# Boutique Estefany - Flujo de Trabajo y Reglas de Negocio

Este documento contiene la lógica de negocio acordada para la aplicación de gestión de la Boutique. El backend está construido en **NestJS** y usa **Prisma ORM** con **PostgreSQL**.

## 1. Tipos de Usuarios (Autenticación)
- **ADMIN:** Solo existe 1 (aunque puede iniciar sesión en múltiples dispositivos). Tiene control total sobre el inventario, aprueba solicitudes y gestiona clientes.
- **CLIENT (Cliente):** Tiene un nivel (Bronce, Plata, Oro) decidido manualmente por el admin. Reciben notificaciones Push (FCM). 

## 2. Tipos de Transacciones (Enfoque Negocio Local)
El Administrador tiene la decisión final sobre los estados y montos:

- **Contado:** Compra directa.
- **Crédito Semanal:** 
  - El sistema sugiere una cuota basada en el total: (<=1000 = $200, 1001-1500 = $250, 1501-2000 = $300, etc.).
  - El Admin puede modificar esta cuota sugerida manualmente.
  - **Aprobación en Persona:** El Admin puede forzar la activación del crédito inmediatamente (si el cliente está en tienda), o dejarlo en `PENDING_APPROVAL` para que el cliente lo acepte en su App.
- **Apartados:** El cliente reserva una prenda. Por defecto dura 1 mes.
  - El sistema **no** cancela automáticamente. Manda alertas al Admin y al Cliente cuando vence el mes.
  - El Admin debe realizar la **cancelación manual** para liberar el stock.
- **Préstamos:** La prenda cambia a estado prestado (`ON_LOAN`). El retorno se confirma mediante escaneo por el Admin.

## 3. Dinámica de Clientes y Deudas
- **Límite de Crédito:** Es una herramienta preventiva. Si una venta lo supera, el Admin puede autorizarla manualmente (`overrideLimit`).
- **Colores de Status:**
  - Se calculan al vuelo según el tiempo transcurrido desde el último abono (> 7 días = Rojo).
  - El Admin gestiona el contacto directo vía WhatsApp desde su panel.
- **Niveles de Cliente:** Bronce, Plata, Oro. Almacenados en DB, asignados manualmente por el Admin.

## 4. Estructura de Inventario y Categorías
- **Jerarquía:** Departamento -> Categoría -> Producto.
- **Gestión:** Ingreso y consulta mediante escaneo de código de barras.

## 5. Pedidos a Domicilio (NUEVO)
- Los clientes pueden solicitar prendas a domicilio (ya que es un área local).
- Se genera un `DeliveryRequest`. El admin revisa y puede Aceptar o Rechazar.

## 6. Sincronización Offline y Base de Datos
- El administrador puede trabajar sin internet (Offline).
- NestJS recibirá las peticiones de sincronización en lote una vez que recupere la conexión.

## 7. Estado del Proyecto (Bitácora)
- **[2026-05-26] Infraestructura Base:** Docker, PostgreSQL, Prisma y Firebase Auth integrados.
- **[2026-05-26] Catálogo:** Departamentos, Categorías y Productos implementados con soporte para tallas y unidades de medida (cm, ml, talla).
- **[2026-05-27] Seguridad:** Implementado `RolesGuard` y `@Roles` para protección estricta de rutas de administración.
- **[2026-05-27] Rediseño de Transacciones:** Cambio a enfoque de "Negocio Local" con control manual total del Administrador.

**Próximo paso:** Implementación del Módulo de Transacciones (Fase 1: Usuarios Enriquecidos y Gestión Financiera).
