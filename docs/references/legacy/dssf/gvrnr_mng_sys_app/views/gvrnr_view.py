import csv, json, re, string
import math
import time
import pandas as pd

from tracemalloc import start
from calendar import month
from django.http import HttpResponse
from django.shortcuts import render
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import connection, transaction
from datetime import datetime, timedelta
from gvrnr_mng_sys_app.util.common_util import session_end_check_handler
from gvrnr_mng_sys_app.models.common_model import Common_model
from gvrnr_mng_sys_app.models.gvrnr_model import Gvrnr_model
from gvrnr_mng_sys_app.models.gvrnr_stat_model import Gvrnr_stat_model

from gvrnr_mng_sys_app.util.database_util import executeQuery


# Create your views here.
@method_decorator(csrf_exempt, name="dispatch")
class gvrnr_crud(View):
    @transaction.atomic
    def post(self, request):
        tmpKeys = []
        mbrUid = request.POST.get("mbrUid")
        file = request.FILES["upload_files"]
        fileName = request.FILES["upload_files"].name

        resDict = {"resCd": "0000", "resMsg": "업로드를 완료하였습니다"}

        successYn = "N"

        try:
            session_end_check_handler(request)

            # 시트 갯수를 얻어내기 위한 Pandas 활용
            sheet_names = pd.ExcelFile(file).sheet_names
            df_sheet_count = len(sheet_names)

            total_data_size = 0
            total_column_size = 0

            startTime = time.time()

            tmpNmIdx = 0
            tmpInsIdx = 0

            for sheetIdx in range(df_sheet_count):
                # 인덱스를 이용해 시트 선택
                df_sheet_index = pd.read_excel(
                    file, sheet_name=sheetIdx, engine="openpyxl", header=1
                )

                # print(df_sheet_index)

                inspctDay = "MON"

                if sheet_names[sheetIdx] == "화요일":
                    inspctDay = "TUE"
                elif sheet_names[sheetIdx] == "수요일":
                    inspctDay = "WED"
                elif sheet_names[sheetIdx] == "목요일":
                    inspctDay = "THU"
                elif sheet_names[sheetIdx] == "금요일":
                    inspctDay = "FRI"
                elif sheet_names[sheetIdx] == "토요일":
                    inspctDay = "SAT"
                elif sheet_names[sheetIdx] == "일요일":
                    inspctDay = "SUN"

                # 전체 갯수를 얻어냄
                print("SIZE : ", df_sheet_index.size)
                total_data_size += df_sheet_index.size

                # 전체 칼럼 갯수를 얻어냄
                print("COLUMN SIZE : ", len(df_sheet_index.index))
                total_column_size += len(df_sheet_index.index)

                # N번째 column의 값들을 모두 가져옴
                # tmpDttmList = df_sheet_index.iloc[:, 0].tolist()
                tmpDttmList = list(sorted(set(df_sheet_index.iloc[:, 0].tolist())))
                # print(df_sheet_index.iloc[:, 0][0])

                # 엑셀 헤더 List
                tmpKeys = df_sheet_index.keys().tolist()
                tmpGvrnrNms = []

                # print(tmpKeys)

                for idx in range(len(tmpKeys)):
                    if idx == 0:
                        continue

                    # 특수문자가 존재할 수도 있으므로 제거 후 List에 넣어준다.
                    tmpGvrnrNms.append(
                        {
                            "cate_cd": (
                                "3100"
                                if "경기"
                                in tmpKeys[idx]
                                .split(".")[0]
                                .translate(str.maketrans("", "", string.punctuation))
                                else "1100"
                            ),
                            "gvrnr_nm": tmpKeys[idx]
                            .split(".")[1]
                            .translate(str.maketrans("", "", string.punctuation))
                            + "."
                            + tmpKeys[idx].split(".")[2],
                        }
                    )

                gvrnrList = Gvrnr_model.getGvrnrList()

                # 데이터에서 가장 빠른 날짜와 가장 늦은 일자 구하기
                startDttm = tmpDttmList[0]
                endDttm = tmpDttmList[len(tmpDttmList) - 1]
                # startDttm = datetime.strptime(tmpDttmList[0], "%Y/%m/%d %H:%M:%S")
                # endDttm = datetime.strptime(tmpDttmList[len(tmpDttmList) - 1], "%Y/%m/%d %H:%M:%S")

                uid = ""

                for nmIdx in range(len(tmpGvrnrNms)):
                    ifExists = False

                    for gvrnrItem in gvrnrList:
                        if (
                            tmpGvrnrNms[nmIdx]["gvrnr_nm"] == gvrnrItem["gvrnr_nm"]
                            and tmpGvrnrNms[nmIdx]["cate_cd"] == gvrnrItem["cate_cd"]
                        ):
                            # print("It's already in")
                            uid = gvrnrItem["gvrnr_uid"]
                            ifExists = True
                            break

                    if ifExists == False:
                        # UID 고유번호 만들기
                        uidNum = int(time.time() * 1000)
                        uid = "gvrnr_" + str(uidNum)

                        resStr = Gvrnr_model.insGvnr(
                            {
                                "mbrUid": mbrUid,
                                "gvrnrUid": uid,
                                "gvrnrNm": tmpGvrnrNms[nmIdx]["gvrnr_nm"],
                                "cateCd": tmpGvrnrNms[nmIdx]["cate_cd"],
                                "inspctDay": inspctDay,
                            }
                        )

                    Gvrnr_stat_model.delGvrnrStat(
                        {"gvrnrUid": uid, "startDate": startDttm, "endDate": endDttm}
                    )

                    for insIdx in range(len(tmpDttmList)):
                        gvrnrPress2 = df_sheet_index[tmpKeys[nmIdx + 1]][insIdx]

                        tmpNmIdx = nmIdx + 1
                        tmpInsIdx = insIdx + 3

                        # if(type(gvrnrPress2) == str) : continue

                        if "*" in str(
                            df_sheet_index[tmpKeys[nmIdx + 1]][insIdx]
                        ) or math.isnan(df_sheet_index[tmpKeys[nmIdx + 1]][insIdx]):
                            gvrnrPress2 = "NULL"

                        Gvrnr_stat_model.insGvrnrStat(
                            {
                                "mbrUid": mbrUid,
                                "gvrnrUid": uid,
                                "recordDttm": tmpDttmList[insIdx],
                                "gvrnrPress1": "NULL",
                                "gvrnrPress2": gvrnrPress2,
                                "gvrnrTrnsps1": "NULL",
                                "gvrnrTrnsps2": "NULL",
                            }
                        )

            successYn = "Y"

        except TimeoutError as e:
            resDict["resCd"] = "0002"
            resDict["resMsg"] = (
                "세션이 만료되었습니다. <br> 하이페리온을 통해 다시 접속해주시길 바랍니다."
            )
        except UnicodeDecodeError as e:
            resDict["resCd"] = "0001"
            resDict["resMsg"] = "파일의 인코딩 형식은 UTF-8이어야 합니다."
        except ValueError as e:
            resDict["resCd"] = "0001"
            resDict["resMsg"] = (
                f"{tmpNmIdx}열 {tmpInsIdx}에 잘못된 형태의 데이터가 있습니다."
            )

            if "time data" in str(e):
                resDict["resMsg"] = (
                    f"{tmpNmIdx}열 {tmpInsIdx}행의 시간 데이터가 잘못되었습니다."
                )
        except TypeError as e:
            resDict["resCd"] = "0001"
            resDict["resMsg"] = (
                f"{tmpNmIdx}열 {tmpInsIdx}행에 잘못된 형태의 데이터가 있습니다."
            )
        except Exception as e:
            print(e)
            print(type(e))
            resDict["resCd"] = "0001"
            resDict["resMsg"] = "파일 업로드에 실패하였습니다."

        endTime = time.time()

        print("Total Column Size : ", total_column_size)
        print("Total Data Size : ", total_data_size)
        print(f"{endTime - startTime:.5f} sec")

        Common_model.insFileUploadLog(
            {"mbrUid": mbrUid, "fileName": fileName, "successYn": successYn}
        )

        return HttpResponse(json.dumps(resDict))


class get_gvrnr_list(View):
    def post(self, request):
        resDict = {"resCd": "0000", "resMsg": "검색이 완료되었습니다."}

        try:
            session_end_check_handler(request)

            startDate = request.POST.get("startDate", "")
            endDate = request.POST.get("endDate", "")
            inspctDay = request.POST.get("inspctDay", "")
            srchCity = request.POST.get("srchCity", "")
            srchCntnt = request.POST.get("srchCntnt", "")

            resDict["gvrnrList"] = Gvrnr_model.getGvrnrSrchResult(
                {
                    "startDate": startDate,
                    "endDate": endDate,
                    "inspctDay": inspctDay,
                    "srchCity": srchCity,
                    "srchCntnt": srchCntnt,
                }
            )
        except TimeoutError as e:
            resDict["resCd"] = "0002"
            resDict["resMsg"] = (
                "세션이 만료되었습니다. <br> 하이페리온을 통해 다시 접속해주시길 바랍니다."
            )
        except Exception as e:
            print("EXCEPTION : ", e)
            resDict["resCd"] = "0001"
            resDict["resMsg"] = "정압기 검색에 실패하였습니다."

        return HttpResponse(json.dumps(resDict))


class get_gvrnr_stats(View):
    def post(self, request):
        startDate = request.POST.get("startDate", "")
        endDate = request.POST.get("endDate", "")
        gvrnrUids = request.POST.get("gvrnrUids", "").split(",")
        gvrnrNms = request.POST.get("gvrnrNms", "").split(",")
        intervalNum = request.POST.get("intervalNum", "")

        if intervalNum == "":
            intervalNum = 1

        resDict = {
            "resCd": "0000",
        }

        try:
            session_end_check_handler(request)

            gvrnrList = Gvrnr_stat_model.getGvrnrStats(
                {
                    "startDate": startDate,
                    "endDate": endDate,
                    "gvrnrUids": gvrnrUids,
                    "intervalNum": intervalNum,
                }
            )

            recordDttmList = []
            tmpDict = {}

            for idx in range(len(gvrnrUids)):
                tmpDict[gvrnrUids[idx]] = {
                    "gvrnr_nm": gvrnrNms[idx],
                    "record_dttm": [],
                    "gvrnr_press1": [],
                    "gvrnr_press2": [],
                    "gvrnr_press2_chart": [],
                    "gvrnr_trnsps1": [],
                    "gvrnr_trnsps2": [],
                }

            for data in gvrnrList:
                recordDttmList.append(
                    datetime.strptime(data["record_dttm"][0:16], "%Y-%m-%d %H:%M")
                )

                tmpDict[data["gvrnr_uid"]]["record_dttm"].append(
                    data["record_dttm"][0:16]
                )
                # tmpDict[data["gvrnr_uid"]]["gvrnr_press1"].append([data["record_dttm"],data["gvrnr_press1"]])
                tmpDict[data["gvrnr_uid"]]["gvrnr_press2"].append(data["gvrnr_press2"])
                # tmpDict[data["gvrnr_uid"]]["gvrnr_press2_chart"].append([datetime.strptime(data["record_dttm"][0:16], "%Y-%m-%d %H:%M"),data["gvrnr_press2"]])
                tmpDict[data["gvrnr_uid"]]["gvrnr_press2_chart"].append(
                    [data["record_dttm"][0:16], data["gvrnr_press2"]]
                )
                # tmpDict[data["gvrnr_uid"]]["gvrnr_trnsps1"].append([data["record_dttm"],data["gvrnr_trnsps1"]])
                # tmpDict[data["gvrnr_uid"]]["gvrnr_trnsps2"].append([data["record_dttm"],data["gvrnr_trnsps2"]])

            # recordDttmList.sort(key=lambda date: datetime.strptime(date, "%Y-%m-%d %H:%M"))
            recordDttmList.sort(key=lambda date: date)

            # resDict["earlistTime"] = recordDttmList[0]
            earlistTime = recordDttmList[0]
            latestTime = recordDttmList[len(recordDttmList) - 1]
            # earlistTime = datetime.strptime(earlistTimeStr, '%Y-%m-%d %H:%M')
            # latestTime = datetime.strptime(latestTimeStr, '%Y-%m-%d %H:%M')

            # monthLaterTime = earlistTime + timedelta(days=31)
            xAxisList = [datetime.strftime(earlistTime, "%Y-%m-%d %H:%M")]

            while earlistTime <= latestTime:
                # earlistTime = earlistTime + timedelta(minutes=int(intervalNum))
                earlistTime = earlistTime + timedelta(minutes=5)
                xAxisList.append(datetime.strftime(earlistTime, "%Y-%m-%d %H:%M"))

            resDict["xAxisList"] = xAxisList
            resDict["statDataObj"] = tmpDict

        except TimeoutError as e:
            resDict["resCd"] = "0002"
            resDict["resMsg"] = (
                "세션이 만료되었습니다. <br> 하이페리온을 통해 다시 접속해주시길 바랍니다."
            )
        except Exception as e:
            print("EXCEPTION : ", e)
            resDict["resCd"] = "0001"
            resDict["resMsg"] = "데이터 조회에 실패했습니다."

        return HttpResponse(json.dumps(resDict))
