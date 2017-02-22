# Read the BNO055 sensor values
#   Inspired by https://github.com/adafruit/Adafruit_Python_BNO055/blob/master/examples/simpletest.py
#   It requires Adafruit_BNO055 library (see licence and notices at https://github.com/adafruit/Adafruit_Python_BNO055)
# Lea, Feb 2017

#import logging
import sys
import time

from Adafruit_BNO055 import BNO055

# Hardware and OS:
# On Raspberry Pi 3, the Bluetooth interfere with UART and GPIO 14 & 15 that we use to control the BNO055 sensor.
# To reestablish the proper behavior, we need to change several things, described in /boot/overlays/README
# 1/ Disable the use of the gpio pins by the Bluetooth driver
#   	systemctl disable hciuart
# 2/ Disable Pi3 Bluetooth and restore UART0/ttyAMA0 over GPIOs 14 & 15
#   	In /boot/config.txt, add
#   	dtoverlay=pi3-disable-bt
# 3/ Prevent to run a console on the port: Edit /boot/cmdline.txt
#       Remove console=serial0,115200 (may also be ttyAMA0) to only leave console=tty1


# Raspberry Pi configuration with serial UART and RST connected to GPIO 18:
bno = BNO055.BNO055(serial_port='/dev/ttyAMA0', rst=18)

# Initialize the BNO055 and stop if something went wrong.
if not bno.begin():
    raise RuntimeError('Failed to initialize BNO055! Is the sensor connected?')

# Check system status and self test result.
status, self_test, error = bno.get_system_status()
##print('System status: {0}'.format(status))
##print('Self test result (0x0F is normal): 0x{0:02X}'.format(self_test))
# Print out an error if system status is in error mode.
if status == 0x01:
    print('System error: {0}'.format(error))
    print('See datasheet section 4.3.59 for the meaning.')

# Print BNO055 software revision and other diagnostic data.
sw, bl, accel, mag, gyro = bno.get_revision()
##print('Software version:   {0}'.format(sw))
##print('Bootloader version: {0}'.format(bl))
##print('Accelerometer ID:   0x{0:02X}'.format(accel))
##print('Magnetometer ID:    0x{0:02X}'.format(mag))
##print('Gyroscope ID:       0x{0:02X}\n'.format(gyro))
##print('Reading BNO055 data, press Ctrl-C to quit...')


# ----- Loop and read values forever

while True:
    # Read the Euler angles for heading, roll, pitch (all in degrees).
    heading, roll, pitch = bno.read_euler()

    # Gyroscope: tuple of X, Y, Z (angular velocity) values in degrees per second
    gyroX, gyroY, gyroZ = bno.read_gyroscope()

    # Magnetometer data (in micro-Teslas):
    magX, magY, magZ = bno.read_magnetometer()

    # Read the calibration status, 0=uncalibrated and 3=fully calibrated.
    ## (Lea) From our tests, only gyro is fully calibrated!
    ##sys, gyro, accel, mag = bno.get_calibration_status()

    # Print  Heading Roll Pitch gyroX gyroY gyroZ
    print('H={0:0.1F} R={1:0.1F} P={2:0.1F} gX={3:0.2F} gY={4:0.2F} gZ={5:0.2F} mX={6:0.2F} mY={7:0.2F} mZ={8:0.2F} '.format(
          heading, roll, pitch, gyroX, gyroY, gyroZ, magX, magY, magZ ))
    sys.stdout.flush()


    # --- Other values you can optionally read:

    # Orientation as a quaternion:
    #x,y,z,w = bno.read_quaterion()
    # Sensor temperature in degrees Celsius:
    #temp_c = bno.read_temp()
    # Accelerometer data (in meters per second squared):
    #x,y,z = bno.read_accelerometer()

    # Linear acceleration data (i.e. acceleration from movement, not gravity--
    # returned in meters per second squared):
    #x,y,z = bno.read_linear_acceleration()
    # Gravity acceleration data (i.e. acceleration just from gravity--returned
    # in meters per second squared):
    #x,y,z = bno.read_gravity()

    # Sleep for some millisecond until the next reading (in seconds)
    # Reading frequency of the BNO055 is 100Hz max, so 3ms are for reading and the rest is sleeping
    time.sleep(0.007)
