import os
from datetime import datetime 
def session_end_check_handler(request):
    print("SESSION ? : ",request.session)
    print("Session expiry date : ",request.session.get_expiry_date())
    print("SESSION ITEMS? : ",request.session.items())

    if(request.session.get("session_exists") == None) : 
        print("Session does not exist")
        raise TimeoutError("Session does not exist")
    else : 
        request.session["session_exists"] = True