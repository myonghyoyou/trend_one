from django.shortcuts import render
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from Crypto.Cipher import DES
import base64, re

# Create your views here.
'''
class main(View):
    def get(self,request):
        #form = Doc_Form()

        return render(request, 'main.html', {})
'''
@method_decorator(csrf_exempt, name='dispatch')
class index(View):
    def get(self,request):
        bad_request = True
        #user_id = ""
        user_id = "TEST"
        if(user_id == "TEST") : bad_request = False

        return render(request, 'index.html', {"bad_request": bad_request, "user_id" : user_id})

    def post(self,request):
        user_id = request.POST.get("userid")
        bad_request = False

        if (user_id == "" or user_id == None) :  bad_request = True
        
        return render(request, 'index.html', {"bad_request": bad_request, "user_id": user_id})

@method_decorator(csrf_exempt, name='dispatch')
class main(View):
    def get(self,request):
        #form = Doc_Form()

        return render(request, 'main.html', {"bad_request": True})

    def post(self,request):
        user_id = request.POST.get("user_id")
        bad_request = False

        if (user_id == "" or user_id == None) :  
            bad_request = True
        elif(user_id == "TEST") :
            #해당 회원 세션 등록 
            request.session["login_session"] = user_id
            request.session["session_exists"] = True
        else : 
            key = b'h2h0i1c5'
            iv = b'h2h0i1c5'
            cipher = DES.new(key, DES.MODE_CBC, iv)
            
            user_id = (cipher.decrypt(base64.b64decode(user_id))).decode("utf-8")
            user_id = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', user_id)

            #해당 회원 세션 등록 
            request.session["login_session"] = user_id
            request.session["session_exists"] = True

        '''
        print("USER ID : ", user_id)
        print("USER ID LENGTH : ", len(user_id))
        print("STRIPPED USER ID LENGTH : ", len(user_id.replace(" ", "")))
        '''

        return render(request, 'main.html', {"bad_request": bad_request, "user_id" : user_id})
