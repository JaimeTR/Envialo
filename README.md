# Envialo

Comparte archivos, carpetas y texto entre equipos de tu misma red local — sin nube, sin límite de tamaño, sin cuentas. Escritorio (Windows/Mac) con Tauri + Next.js, backend en Rust.

## Descargar

Última versión: [Releases](https://github.com/JaimeTR/Envialo/releases/latest)

- **Windows**: `.exe` (instalador NSIS) o `.msi`
- **macOS**: `.dmg` (Apple Silicon `aarch64` o Intel `x64`)

## Cómo funciona

- **Descubrimiento (mDNS)**: cada equipo con Envialo abierto se anuncia en la red local y detecta a los demás automáticamente, sin configurar nada.
- **Emparejamiento**: antes de recibir de un equipo nuevo, ambos confirman un mismo código de 6 dígitos (como Bluetooth/AirDrop).
- **Transferencia real**: archivos, carpetas completas y notas de texto viajan directo entre los dos equipos por la red local, con progreso en vivo.
- **Acceso desde celular**: la app expone una página web simple (`http://<ip-de-tu-pc>:51414`) para mandar un archivo desde el navegador del celular a cualquier equipo de la red — sin instalar nada en el celular.
- **Actualizaciones automáticas**: la app avisa sola cuando hay una versión nueva publicada acá en GitHub Releases.

## Estado del proyecto

| Fase | Qué es | Estado |
|---|---|---|
| 1 | Interfaz completa | ✅ |
| 2 | Descubrimiento de dispositivos (mDNS) | ✅ |
| 3 | Emparejamiento con código de seguridad | ✅ |
| 4 | Transferencia real de archivos | ✅ |
| 5 | Acceso desde celular (navegador) | ✅ (solo envío celular → PC) |
| 6 | Auto-actualización | ✅ |

## Desarrollo

```bash
npm install
npx tauri dev
```

Requiere [Rust](https://rustup.rs) y las dependencias nativas de Tauri para tu sistema operativo ([guía oficial](https://v2.tauri.app/start/prerequisites/)).

### Compilar el instalador

```bash
npx tauri build
```

Genera el instalador para el sistema operativo donde se ejecuta (no hay compilación cruzada: Windows compila para Windows, Mac para Mac).

## Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Rust (Tauri 2) — `mdns-sd`, sockets TCP propios para emparejamiento/transferencia, `tiny_http` para el puente móvil
- **Empaquetado y releases**: GitHub Actions, firmado y publicado automático al pushear un tag `v*`

## Licencia

Privado — Devmark.
