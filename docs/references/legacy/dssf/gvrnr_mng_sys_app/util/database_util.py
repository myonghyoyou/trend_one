from tokenize import single_quoted
from uuid import getnode
from django.db import connection

def executeQuery(query, returnType):

    print(query)

    with connection.cursor() as cursor:
        cursor.execute(query)

        if( returnType == 'getOne' ):
            return dictfetchone(cursor)

        elif( returnType == 'getList' ):
            return dictfetchall(cursor)

        elif( returnType == 'CREATE'):
            return 'DATA CREATION SUCCESS'

        elif( returnType == 'UPDATE'):
            return 'DATA UPDATE SUCCESS'

        elif( returnType == 'DELETE'):
            return 'DATA DELETE SUCCESS'

def dictfetchall(cursor):
    "Return all rows from a cursor as a dict"
    columns = [col[0] for col in cursor.description]
    fetchedData = cursor.fetchall()

    return [
        dict(zip(columns, row))
        for row in fetchedData
    ]

def dictfetchone(cursor):
    "Retrun single row from a cursor as a dict"
    rowDict = {}

    fetchedVal = cursor.fetchone()

    '''
    print("CURSOR FETCHONE : ",cursor.fetchone())
    print("FETCHONE NONE ? : ",cursor.fetchone() == None)
    print("CURSOR DESC : ",cursor.description)
    print("KEYS : ",[c[0] for c in cursor.description])
    '''
    
    #print(zip( [c[0] for c in cursor.description], list(cursor.fetchone())))
    #[item['id'] for item in cursor.fetchall()

    if(fetchedVal != None):
        rowDict = dict(zip([c[0] for c in cursor.description], fetchedVal))
        
    return rowDict