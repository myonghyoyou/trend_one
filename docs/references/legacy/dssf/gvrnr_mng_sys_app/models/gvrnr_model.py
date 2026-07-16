from gvrnr_mng_sys_app.util.database_util import executeQuery

# Create your models here.
class Gvrnr_model:
    def getGvrnrCnt(obj):
        result =  executeQuery(
            f"""
                SELECT
                    a.gvrnr_uid,
                    COUNT(a.*) as gvrnr_cnt, 
                    COUNT(b.*) as gvrnr_stat_cnt
                FROM
                    (SELECT
                        *
                        FROM
                            t_governor
                        WHERE
                            1=1 AND
                            gvrnr_nm = '{obj["gvrnrNm"]}') a
                    LEFT OUTER JOIN
                    (SELECT
                        *
                        FROM
                            t_governor_stat
                        WHERE
                            1=1
                            AND DATE_TRUNC('day', record_dttm) >= '{obj["startDate"]}'::timestamp
                            AND DATE_TRUNC('day', record_dttm) <= '{obj["endDate"]}'::timestamp) b
                    ON a.gvrnr_uid = b.gvrnr_uid
                WHERE
                    1=1
                GROUP BY
                    a.gvrnr_uid
            """
        , "getOne")
    
        return result

    def getGvrnrList():
        result = executeQuery(
            f"""
                SELECT
                    gvrnr_uid, gvrnr_nm, cate_cd
                FROM
                    t_governor
                WHERE
                    1=1
            """
        , "getList")

        return result

    def getGvrnrSrchResult(obj):

        whereCondition1 = ""
        whereCondition2 = ""

        if(obj["srchCntnt"] != ""):
            whereCondition1 = "AND gvrnr_nm LIKE '%" +  obj["srchCntnt"] + "%'"

        if(obj["inspctDay"] != ""):
            whereCondition2 = "AND inspct_day = '" + obj["inspctDay"] + "'"
        
        result =  executeQuery(
            f"""
                SELECT
                    a.gvrnr_uid, COUNT(a.*) as gvrnr_stat_cnt
                    ,c.cd_name, b.gvrnr_nm, b.inspct_day 
                FROM
                    (SELECT
                        *
                        FROM
                            t_governor_stat
                        WHERE
                            1=1
                            AND DATE_TRUNC('day', record_dttm) >= '{obj["startDate"]}'::timestamp
                            AND DATE_TRUNC('day', record_dttm) <= '{obj["endDate"]}'::timestamp) a
                    JOIN
                    (SELECT
                        *
                        FROM
                            t_governor
                        WHERE
                            1=1 AND
                            cate_cd = '{obj["srchCity"]}' 
                            {whereCondition1}
                            {whereCondition2}
                        ORDER BY
                            gvrnr_nm ASC) b   
                    ON a.gvrnr_uid = b.gvrnr_uid
                    JOIN
                    (SELECT
                    	*
                    	FROM
                    		t_region_cd) c
            		ON b.cate_cd = c.cate_cd
                WHERE
                    1=1
                GROUP BY
                    a.gvrnr_uid, b.gvrnr_nm, b.inspct_day, c.cd_name
                ORDER BY
                    b.gvrnr_nm ASC
            """
        , "getList")
    
        return result

    def insGvnr(obj):
        result = executeQuery(
                    f"""
                        INSERT INTO t_governor 
                            (gvrnr_uid, gvrnr_nm, cate_cd
                            ,rgst_dttm, rgst_uid
                            ,updt_dttm, updt_uid
                            ,inspct_day)
                        VALUES
                            ('{obj["gvrnrUid"]}', '{obj["gvrnrNm"]}', '{obj["cateCd"]}'
                            ,to_char(now(), 'YYYY-MM-DD HH:MI:SS')::timestamp, '{obj["mbrUid"]}'
                            ,to_char(now(), 'YYYY-MM-DD HH:MI:SS')::timestamp, '{obj["mbrUid"]}'
                            ,'{obj["inspctDay"]}')
                    """
                , "INSERT")
        
        return result