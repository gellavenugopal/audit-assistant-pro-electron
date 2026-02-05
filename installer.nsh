; Custom NSIS installer script for ICAI VERA
; This script runs during installation to customize the installer experience

!macro customHeader
  !system "echo Custom NSIS installer for ICAI VERA"
!macroend

; Custom installation steps
!macro customInstall
  ; This runs during installation
  DetailPrint "Installing ICAI VERA..."
  DetailPrint "Setting up database schema files..."
  DetailPrint "Configuring application..."
  
  ; Remove old Audit Assistant Pro shortcuts if they exist
  Delete "$DESKTOP\Audit Assistant Pro.lnk"
  Delete "$SMPROGRAMS\Audit Assistant Pro.lnk"
  
  ; Create application data directory
  CreateDirectory "$APPDATA\icai-vera"
  
  ; Installation complete message
  DetailPrint "Installation completed successfully!"
  DetailPrint "The database will be initialized on first run."
!macroend

; Custom uninstall steps
!macro customUnInstall
  DetailPrint "Removing ICAI VERA..."
  
  ; Remove desktop shortcut (handled by electron-builder, but good to ensure cleanup)
  Delete "$DESKTOP\ICAI VERA.lnk"
  
  ; Ask user if they want to keep their data
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to keep your ICAI VERA audit data and database?$\n$\n\
    Click YES to keep your data (you can restore it if you reinstall)$\n\
    Click NO to delete all data (this cannot be undone)" \
    IDYES KeepData
  
  ; User chose to delete data
  DetailPrint "Removing application data..."
  RMDir /r "$APPDATA\icai-vera"
  Goto Done
  
  KeepData:
    DetailPrint "Keeping application data at: $APPDATA\icai-vera"
  
  Done:
    DetailPrint "Uninstallation completed!"
!macroend
