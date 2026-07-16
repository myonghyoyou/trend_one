from gvrnr_mng_sys_app.util.database_util import executeQuery

class Gvrnr_stat_model:
    def delGvrnrStat(obj):
        result = executeQuery(
                    f"""
                        DELETE FROM t_governor_stat
                        WHERE
                            1=1
                            AND gvrnr_uid = '{obj["gvrnrUid"]}'
                            AND DATE_TRUNC('second', record_dttm) >= '{obj["startDate"]}'::timestamp
                            AND DATE_TRUNC('second', record_dttm) <= '{obj["endDate"]}'::timestamp 
                    """
                , "DELETE")
        
        return result

    def insGvrnrStat(obj):
        result = executeQuery(
                    f"""
                        INSERT INTO t_governor_stat 
                            (gvrnr_uid, record_dttm, gvrnr_press1
                            ,gvrnr_press2, gvrnr_trnsps1, gvrnr_trnsps2
                            ,rgst_dttm, rgst_uid
                            ,updt_dttm, updt_uid)
                        VALUES
                            ('{obj["gvrnrUid"]}', '{obj["recordDttm"]}', {obj["gvrnrPress1"]}
                            ,{obj["gvrnrPress2"]}, {obj["gvrnrTrnsps1"]}, {obj["gvrnrTrnsps2"]}
                            ,to_char(now(), 'YYYY-MM-DD HH:MI:SS')::timestamp, '{obj["mbrUid"]}'
                            ,to_char(now(), 'YYYY-MM-DD HH:MI:SS')::timestamp, '{obj["mbrUid"]}')
                    """
                , "DELETE")
        
        return result

    def getGvrnrStats(obj):
        print(obj["gvrnrUids"])

        whereCondition = "AND (gvrnr_uid = '"

        for idx in range(len(obj["gvrnrUids"])):
            if(idx == 0): whereCondition += obj["gvrnrUids"][idx] + "'"
            else: whereCondition += " or gvrnr_uid = '" + obj["gvrnrUids"][idx] + "'"

            if(idx+1 == len(obj["gvrnrUids"])): whereCondition += ")"
        
        result = executeQuery(
                    f"""
                        SELECT
                            gvrnr_uid, gvrnr_press1::float, gvrnr_press2::float
                            ,gvrnr_trnsps1, gvrnr_trnsps2, to_char(record_dttm, 'YYYY-MM-DD HH24:MI:SS') as record_dttm
                        FROM
                                t_governor_stat a
                                JOIN
                                    generate_series(
                                    '{obj["startDate"]}'::date,
                                    '{obj["endDate"]}'::date,
                                    '{obj["intervalNum"]} minutes'::interval
                                    ) as interval_dttm
                                ON
                                    a.record_dttm = interval_dttm
                        WHERE
                            1=1
                            {whereCondition}
                            AND DATE_TRUNC('day', record_dttm) >= '{obj["startDate"]}'::timestamp
                            AND DATE_TRUNC('day', record_dttm) <= '{obj["endDate"]}'::timestamp; 
                    """
                , "getList")

        '''
        FROM
            t_governor_stat a
            JOIN
                generate_series(
                '2022-05-02'::date,
                '2022-05-10'::date,
                '21 minutes'::interval
                ) as interval_dttm
            ON
                a.record_dttm = interval_dttm 
        '''
        
        return result

    


    

    
        
        