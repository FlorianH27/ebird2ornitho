Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

# WPF Interface Design (XAML) - Kompaktes Layout (800x500) ohne Umlaute
[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="ebird2ornitho Updater" Height="500" Width="800"
        WindowStartupLocation="CenterScreen" ResizeMode="NoResize"
        Background="#F4F6F8">
    <Window.Resources>
        <!-- Style fuer den primaeren Button -->
        <Style x:Key="BtnPrimary" TargetType="Button">
            <Setter Property="FontSize" Value="16"/>
            <Setter Property="FontWeight" Value="Bold"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="Background" Value="#2563EB"/>
            <Setter Property="Padding" Value="24,12"/>
            <Setter Property="Margin" Value="10,0"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="border" Background="{TemplateBinding Background}" CornerRadius="8" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#1D4ED8"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <!-- Style fuer den sekundaeren Button -->
        <Style x:Key="BtnSecondary" TargetType="Button">
            <Setter Property="FontSize" Value="16"/>
            <Setter Property="FontWeight" Value="Bold"/>
            <Setter Property="Foreground" Value="#475569"/>
            <Setter Property="Background" Value="#E2E8F0"/>
            <Setter Property="Padding" Value="24,12"/>
            <Setter Property="Margin" Value="10,0"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border x:Name="border" Background="{TemplateBinding Background}" CornerRadius="8" Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter Property="Background" Value="#CBD5E1"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>

    <Border Padding="25">
        <!-- Haupt-Card -->
        <Border Background="#FFFFFF" CornerRadius="16" Padding="30">
            <Border.Effect>
                <DropShadowEffect BlurRadius="20" Color="Black" Opacity="0.08" ShadowDepth="8"/>
            </Border.Effect>

            <Grid>
                <Grid.RowDefinitions>
                    <RowDefinition Height="Auto"/>
                    <RowDefinition Height="*"/>
                    <RowDefinition Height="Auto"/>
                </Grid.RowDefinitions>

                <!-- Titel -->
                <TextBlock Grid.Row="0" Text="ebird2ornitho Auto-Updater" FontSize="26" FontWeight="Bold"
                           Foreground="#0F172A" HorizontalAlignment="Center" Margin="0,0,0,20"/>

                <!-- Inhaltsbereich -->
                <Grid Grid.Row="1" VerticalAlignment="Center">
                    <!-- View: Start -->
                    <StackPanel x:Name="ViewStart" Visibility="Visible">
                        <TextBlock Text="Sollen die neuesten Dateien von GitHub heruntergeladen und dieser Ordner ueberschrieben werden?"
                                   FontSize="16" Foreground="#475569" TextWrapping="Wrap" TextAlignment="Center" LineHeight="24"/>
                    </StackPanel>

                    <!-- View: Progress -->
                    <StackPanel x:Name="ViewProgress" Visibility="Collapsed">
                        <Border x:Name="StatusBorder" Background="#F1F5F9" CornerRadius="10" Padding="20">
                            <TextBlock x:Name="TxtStatus" Text="Lade neueste Dateien von GitHub herunter..."
                                       FontSize="18" FontWeight="Bold" Foreground="#334155"
                                       TextAlignment="Center" TextWrapping="Wrap"/>
                        </Border>
                    </StackPanel>

                    <!-- View: Success -->
                    <StackPanel x:Name="ViewSuccess" Visibility="Collapsed">
                        <Border Background="#DCFCE7" CornerRadius="10" Padding="15" Margin="0,0,0,15">
                            <TextBlock Text="Update erfolgreich!" FontSize="18" FontWeight="Bold" Foreground="#166534" TextAlignment="Center"/>
                        </Border>

                        <!-- Steps Box -->
                        <Border Background="#F8FAFC" BorderBrush="#E2E8F0" BorderThickness="2" CornerRadius="10" Padding="20">
                            <StackPanel>
                                <TextBlock Text="Letzter Schritt im Browser:" FontSize="16" FontWeight="Bold" Foreground="#334155" Margin="0,0,0,10"/>
                                <TextBlock FontSize="14" Foreground="#334155" LineHeight="22">
                                    1. Gehe zum Browser<LineBreak/>
                                    2. <Run FontStyle="Italic">Erweiterungen verwalten</Run> aufrufen<LineBreak/>
                                    3. Bei <Run FontWeight="Bold">ebird2ornitho</Run> auf <Run FontWeight="Bold">"Neu laden"</Run> klicken
                                </TextBlock>
                            </StackPanel>
                        </Border>
                    </StackPanel>
                </Grid>

                <!-- Button Gruppe -->
                <StackPanel Grid.Row="2" Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,20,0,0">
                    <Button x:Name="BtnPrimary" Content="Jetzt Aktualisieren" Style="{StaticResource BtnPrimary}"/>
                    <Button x:Name="BtnSecondary" Content="Abbrechen" Style="{StaticResource BtnSecondary}"/>
                </StackPanel>
            </Grid>
        </Border>
    </Border>
</Window>
"@

try {
    # Read XAML GUI
    $reader = (New-Object System.Xml.XmlNodeReader $xaml)
    $window = [Windows.Markup.XamlReader]::Load($reader)
}
catch {
    [System.Windows.MessageBox]::Show("Fehler beim Laden des GUI-Layouts:`n" + $_.Exception.Message, "Startfehler", "OK", "Error")
    exit
}

# Element-Referenzen abrufen
$viewStart     = $window.FindName("ViewStart")
$viewProgress  = $window.FindName("ViewProgress")
$viewSuccess   = $window.FindName("ViewSuccess")
$txtStatus     = $window.FindName("TxtStatus")
$statusBorder  = $window.FindName("StatusBorder")
$btnPrimary    = $window.FindName("BtnPrimary")
$btnSecondary  = $window.FindName("BtnSecondary")

# Event: Abbrechen / Fenster Schliessen
$btnSecondary.Add_Click({
    $window.Close()
})

# Event: Update Starten
$btnPrimary.Add_Click({
    if ($btnPrimary.Content -eq "Schliessen") {
        $window.Close()
        return
    }

    # UI auf Fortschritt umstellen
    $viewStart.Visibility = [System.Windows.Visibility]::Collapsed
    $viewProgress.Visibility = [System.Windows.Visibility]::Visible
    $btnPrimary.IsEnabled = $false
    $btnSecondary.IsEnabled = $false

    # Rendering der Benutzeroberflaeche vor Download erzwingen
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)

    try {
        $repoUrl = "https://github.com/FlorianH27/ebird2ornitho/archive/refs/heads/main.zip"
        $zip = "latest.zip"
        $temp = "temp_update"

        # Download & Entpacken
        Invoke-WebRequest -Uri $repoUrl -OutFile $zip -UseBasicParsing
        Expand-Archive -Path $zip -DestinationPath $temp -Force

        # Inhalt aus Unterordner kopieren
        $subFolder = Get-ChildItem -Path $temp -Directory | Select-Object -First 1
        if ($subFolder) {
            Copy-Item -Path "$($subFolder.FullName)\*" -Destination "." -Recurse -Force
        }

        # Aufraeumen
        Remove-Item -Path $temp -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $zip -Force -ErrorAction SilentlyContinue

        # UI auf Erfolg umstellen
        $viewProgress.Visibility = [System.Windows.Visibility]::Collapsed
        $viewSuccess.Visibility = [System.Windows.Visibility]::Visible

        $btnPrimary.Content = "Schliessen"
        $btnPrimary.IsEnabled = $true
        $btnSecondary.Visibility = [System.Windows.Visibility]::Collapsed
    }
    catch {
        # Fehlerbehandlung
        $txtStatus.Text = "Fehler beim Update! Bitte Internetverbindung pruefen."
        $txtStatus.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#991B1B")
        $statusBorder.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#FEE2E2")

        $btnPrimary.Content = "Schliessen"
        $btnPrimary.IsEnabled = $true
    }
})

# Fenster anzeigen
$window.ShowDialog() | Out-Null