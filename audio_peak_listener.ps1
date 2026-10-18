# audio_peak_listener.ps1 - CoreAudio Output Peak Meter
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not ([System.Management.Automation.PSTypeName]'SystemAudio.PeakMeter').Type) {
$code = @"
using System;
using System.Runtime.InteropServices;

namespace SystemAudio {
    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator {
        int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr ppDevices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice {
        int Activate([MarshalAs(UnmanagedType.LPStruct)] Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [ComImport, Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioMeterInformation {
        int GetPeakValue(out float pfPeak);
    }

    public class PeakMeter {
        private static IAudioMeterInformation meter;

        public static bool Init() {
            try {
                var enumType = Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"));
                var enumerator = (IMMDeviceEnumerator)Activator.CreateInstance(enumType);
                IMMDevice device;
                enumerator.GetDefaultAudioEndpoint(0, 1, out device);
                
                Guid meterGuid = new Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064");
                object obj;
                device.Activate(meterGuid, 23, IntPtr.Zero, out obj);
                meter = (IAudioMeterInformation)obj;
                return meter != null;
            } catch {
                return false;
            }
        }

        public static float GetPeak() {
            if (meter == null) return 0f;
            float peak = 0f;
            try {
                meter.GetPeakValue(out peak);
            } catch { }
            return peak;
        }
    }
}
"@
    Add-Type -TypeDefinition $code -ErrorAction Stop
}

$initialized = [SystemAudio.PeakMeter]::Init()
if (-not $initialized) {
    Write-Output "ERROR: CoreAudio initialization failed"
    exit 1
}

Write-Output "AUDIO_LISTENER_ACTIVE"

# Monitor system volume peaks (> 5% output level)
while ($true) {
    try {
        $peak = [SystemAudio.PeakMeter]::GetPeak()
        if ($peak -gt 0.05) {
            Write-Output "SPIKE:$peak"
            Start-Sleep -Seconds 3 # 3-second cooldown following notification chime
        }
    } catch {}
    Start-Sleep -Milliseconds 80
}