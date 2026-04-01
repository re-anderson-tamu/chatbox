!include LogicLib.nsh

; Finish page: "Open Getting Started guide" checkbox (checked by default, installer only)
!ifndef BUILD_UNINSTALLER
  !define MUI_FINISHPAGE_SHOWREADME ""
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Open Getting Started guide"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "OpenGettingStarted"

  Function OpenGettingStarted
    ExecShell "open" "https://tamunri.atlassian.net/wiki/spaces/AI/pages/1060569089/Getting+Started+with+Quercus"
  FunctionEnd
!endif

!macro customInit
  ; Check for x64 VC++ Redistributable (skip ARM64 check for now)
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != "1"
    MessageBox MB_YESNO|MB_ICONQUESTION "\
      ${PRODUCT_NAME} requires Microsoft Visual C++ Redistributable 2015-2022 (x64).$\r$\n$\r$\n\
      Would you like to download and install it now?" IDYES InstallVCRedist IDNO SkipVCRedist
    
    InstallVCRedist:
      ; Download using inetc plugin with visual progress
      inetc::get /CAPTION " " /BANNER "Downloading Microsoft Visual C++ Redistributable..." "https://aka.ms/vs/17/release/vc_redist.x64.exe" "$TEMP\vc_redist.x64.exe"
      Pop $1
      ${If} $1 != "OK"
        MessageBox MB_OK|MB_ICONSTOP "Failed to download Visual C++ Redistributable.$\r$\n$\r$\nPlease install it manually from:$\r$\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe"
        Abort
      ${EndIf}
      
      ; Install VC++ Redistributable
      DetailPrint "Installing Microsoft Visual C++ Redistributable..."
      ExecWait '"$TEMP\vc_redist.x64.exe" /install /quiet /norestart' $2
      
      ; Clean up
      Delete "$TEMP\vc_redist.x64.exe"
      
      ; Check if installation was successful
      ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
      ${If} $0 != "1"
        MessageBox MB_OK|MB_ICONSTOP "Failed to install Visual C++ Redistributable.$\r$\n$\r$\nThe installation cannot continue."
        Abort
      ${EndIf}
      
      DetailPrint "Visual C++ Redistributable installed successfully!"
      Goto Done
    
    SkipVCRedist:
      MessageBox MB_OK|MB_ICONEXCLAMATION "Visual C++ Redistributable is required for ${PRODUCT_NAME} to run properly.$\r$\n$\r$\nPlease install it manually from:$\r$\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe"
      Abort
  ${EndIf}
  
  Done:
!macroend