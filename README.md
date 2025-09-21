# Ninjabrainbot Web Client
Display [Ninjabrain Bot](https://github.com/ninjabrain1/ninjabrain-bot) data on any device with ease.

<img width="1100" height="500" alt="nin" src="https://github.com/user-attachments/assets/508f8937-9dcb-438f-9aea-90d3c6a1c587" />

## Supported Features
  - [x] Fossil Divine
  - [x] Blind coords (f3+c in nether)
  - [x] Eye Throws
  - [x] Boat status indicator
  - [ ] Eye adjustment count
  - [ ] Feedback messages (bad measurement, wrong version detected etc.)
  - [ ] Buttons for Undo, Redo, Reset and Remove measurement

## Requirements
- You need to use Ninjabrain Bot (version 1.5 or higher). You can download it here.
- Make sure to enable the API option in the Ninjabrain Bot advanced settings,otherwise the overlay won't work.

## Getting started
- Download the [latest release](https://github.com/cylorun/ninbot-overlay/releases/latest).
- Run the downloaded file, and a configuration window will open up along with a QR code.
- Open the provided URL in any browser on any device **connected to the same local network** (PC, phone, laptop, etc.).

  ### If you are not on windows
  - Download the source code, [here](https://github.com/cylorun/ninbot-web-client/archive/refs/heads/main.zip)
  - Unzip the folder
  - Make sure you have python 3.12+ installed (other versions might work too, but 3.12 is a safe options since that's what i've used to dev this)
  - Run `pip install -r requirements.txt` in the directory of the project.
  - Then you can run `app.py`.

## Credits
- Huge thanks to [mebuki](https://github.com/mebuki117) for adding a lot of ninjabrain bots features over to this.
