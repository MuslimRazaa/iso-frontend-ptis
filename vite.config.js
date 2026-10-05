import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// Plays the "Chaloo Sound" VS Code extension's sound once the dev server is up.
// The extension itself only fires when a terminal command *exits*, and `vite`
// keeps running, so it never gets a chance to play — this covers that case.
// Silently does nothing unless Windows + the extension is installed, so it
// can't affect teammates who don't have it.
function chalooOnReady() {
  return {
    name: 'chaloo-on-ready',
    apply: 'serve',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        try {
          if (process.platform !== 'win32') return
          const extDir = join(homedir(), '.vscode', 'extensions')
          const ext = readdirSync(extDir).find((d) => d.startsWith('ahk.chaloo-sound'))
          const file = ext && join(extDir, ext, 'media', 'Chaloo.mp3')
          if (!file || !existsSync(file)) return
          const ps = `Add-Type -AssemblyName presentationCore; $p = New-Object System.Windows.Media.MediaPlayer; $p.Open([uri]'${file.replace(/'/g, "''")}'); $p.Play(); Start-Sleep -Seconds 6`
          // Not `detached`: with it PowerShell never starts (no console), so nothing plays.
          spawn('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], { stdio: 'ignore', windowsHide: true }).unref()
        } catch { /* sound is a nicety, never break the dev server */ }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), chalooOnReady()],
})
