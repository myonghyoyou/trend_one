from gvrnr_mng_sys_app.util.database_util import executeQuery

# Create your models here.
class Common_model:
    def insFileUploadLog(obj):
        result =  executeQuery(
            f"""
                INSERT INTO t_file_upload_log 
                    (
                        mbr_uid, success_yn, file_name
                        ,rgst_dttm, rgst_uid
                        ,updt_dttm, updt_uid
                    )
                    VALUES
                    (
                        '{obj["mbrUid"]}', '{obj["successYn"]}', '{obj["fileName"]}'
                        ,to_char(now(), 'YYYY-MM-DD HH:MI:SS')::timestamp, '{obj["mbrUid"]}'
                        ,to_char(now(), 'YYYY-MM-DD HH:MI:SS')::timestamp, '{obj["mbrUid"]}'
                    )
            """
        , "CREATE")
    
        return result
