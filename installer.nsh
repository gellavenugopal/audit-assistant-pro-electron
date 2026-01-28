; Custom NSIS installer script for Audit Assistant Pro
; This script runs during installation to customize the installer experience

!macro customHeader
  !system "echo Custom NSIS installer for Audit Assistant Pro"
!macroend

; Custom installation steps
!macro customInstall
  ; This runs during installation
  DetailPrint "Installing Audit Assistant Pro..."
  DetailPrint "Setting up database schema files..."
  DetailPrint "Configuring application..."
  
  ; Create application data directory
  CreateDirectory "$APPDATA\audit-assistant-pro"
  
  ; Create desktop shortcut (backup in case electron-builder doesn't)
  CreateShortCut "$DESKTOP\Audit Assistant Pro.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  
  ; Installation complete message
  DetailPrint "Desktop shortcut created!"
  DetailPrint "Installation completed successfully!"
  DetailPrint "The database will be initialized on first run."
!macroend

; Custom uninstall steps
!macro customUnInstall
  DetailPrint "Removing Audit Assistant Pro..."
  
  ; Remove desktop shortcut
  Delete "$DESKTOP\Audit Assistant Pro.lnk"
  
  ; Ask user if they want to keep their data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to keep your audit data and database?$\n$\n\
    Click YES to keep your data (you can restore it if you reinstall)$\n\
    Click NO to delete all data (this cannot be undone)" \
    IDYES KeepData
  
  ; User chose to delete data
  DetailPrint "Removing application data..."
  RMDir /r "$APPDATA\audit-assistant-pro"
  Goto Done
  
  KeepData:
    DetailPrint "Keeping application data at: $APPDATA\audit-assistant-pro"
  
  Done:
    DetailPrint "Uninstallation completed!"
!macroend
