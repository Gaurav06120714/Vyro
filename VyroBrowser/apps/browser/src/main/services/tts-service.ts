import { spawn, ChildProcess, execSync } from 'child_process';
import { platform } from 'process';

let ttsProcess: ChildProcess | null = null;

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function isTTSSupported(): boolean {
  if (platform === 'darwin') return true;
  if (platform === 'win32') return true; // PowerShell always available on Windows
  if (platform === 'linux') return commandExists('espeak') || commandExists('festival');
  return false;
}

export function startTTS(text: string, voice?: string): { ok: boolean; error?: string } {
  stopTTS();
  const safeText = text.slice(0, 10000);

  if (platform === 'darwin') {
    const args = voice ? ['-v', voice, safeText] : [safeText];
    ttsProcess = spawn('say', args);
    ttsProcess.on('error', () => { ttsProcess = null; });
    ttsProcess.on('exit', () => { ttsProcess = null; });
    return { ok: true };
  }

  if (platform === 'win32') {
    // Use PowerShell Speech Synthesis
    const escaped = safeText.replace(/'/g, "''");
    const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ${voice ? `$s.SelectVoice('${voice}');` : ''} $s.Speak('${escaped}')`;
    ttsProcess = spawn('powershell.exe', ['-NoProfile', '-Command', ps]);
    ttsProcess.on('error', () => { ttsProcess = null; });
    ttsProcess.on('exit', () => { ttsProcess = null; });
    return { ok: true };
  }

  if (platform === 'linux') {
    if (commandExists('espeak')) {
      const args = voice ? ['-v', voice, safeText] : [safeText];
      ttsProcess = spawn('espeak', args);
      ttsProcess.on('error', () => { ttsProcess = null; });
      ttsProcess.on('exit', () => { ttsProcess = null; });
      return { ok: true };
    }
    if (commandExists('festival')) {
      ttsProcess = spawn('festival', ['--tts']);
      ttsProcess.stdin?.write(safeText);
      ttsProcess.stdin?.end();
      ttsProcess.on('error', () => { ttsProcess = null; });
      ttsProcess.on('exit', () => { ttsProcess = null; });
      return { ok: true };
    }
    return { ok: false, error: 'No TTS engine found. Install espeak or festival.' };
  }

  return { ok: false, error: `TTS not supported on platform: ${platform}` };
}

export function stopTTS(): void {
  if (ttsProcess) {
    ttsProcess.kill('SIGTERM');
    ttsProcess = null;
  }
}
