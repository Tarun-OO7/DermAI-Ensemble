import requests

url = "http://localhost:3000/api/diagnostic/lung"
files = {'file': ('valid_test.png', open('valid_test.png', 'rb'), 'image/png')}
response = requests.post(url, files=files)
print(response.status_code)
print(response.text)
