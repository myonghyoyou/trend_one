from django.http import JsonResponse, HttpResponse
from django.db import transaction
from gvrnr_mng_sys_app.models.transaction_model import Transaction
from gvrnr_mng_sys_app.models.gvrnr_model import Gvrnr_model
from gvrnr_mng_sys_app.models.gvrnr_stat_model import Gvrnr_stat_model
import json


def create_transaction(request):
    # 가상의 트랜잭션 생성
    transaction = Transaction.objects.create(status="pending")

    return HttpResponse(
        json.dumps(
            {
                "resCd": "0000",
                "transaction_id": str(transaction.transaction_id),
                "status": transaction.status,
            }
        )
    )


def update_transaction_status(request):
    if request.method == "POST":
        transaction_id = request.POST.get("transaction_id")
        new_status = request.POST.get("status")

        try:
            transaction = Transaction.objects.get(transaction_id=transaction_id)
            transaction.status = new_status
            transaction.save()

            return JsonResponse(
                {
                    "transaction_id": str(transaction.transaction_id),
                    "status": transaction.status,
                }
            )
        except Transaction.DoesNotExist:
            return JsonResponse({"error": "Transaction not found"}, status=404)


def get_transactions_in_progress(request):
    # "진행 중"으로 간주하는 상태들 정의
    in_progress_statuses = ["pending", "in_progress"]
    resDict = {"resCd": "0000"}

    try:
        # 이 상태를 가진 트랜잭션들을 조회
        transactions = Transaction.objects.filter(status__in=in_progress_statuses)

        # 트랜잭션 리스트를 JSON으로 변환하여 반환
        transactions_list = [
            {
                "transaction_id": str(transaction.transaction_id),
                "status": transaction.status,
                "data": transaction.data,
                "created_at": transaction.created_at.isoformat(),
                "updated_at": transaction.updated_at.isoformat(),
            }
            for transaction in transactions
        ]

        resDict["transactionsList"] = transactions_list

    except Exception as e:
        print("ERROR : ", e)
        transactions_list = []

    return HttpResponse(json.dumps(resDict))


def rollback_all_transactions_in_progress(request):
    try:
        with transaction.atomic():
            # `pending` 또는 `in_progress` 상태인 모든 트랜잭션 조회
            transactions_to_rollback = Transaction.objects.filter(
                status__in=["pending", "in_progress"]
            )

            if len(transactions_to_rollback) == 0:
                return HttpResponse(
                    json.dumps(
                        {"resCd": "0000", "message": "No transactions to rollback"}
                    )
                )

            # 해당 트랜잭션들과 연관된 작업을 되돌립니다.
            for transaction_record in transactions_to_rollback:
                # 트랜잭션과 연관된 데이터베이스 작업을 되돌림 (예: 생성된 객체 삭제)
                associated_gvrnr = Gvrnr_model.objects.filter(
                    transaction_id=transaction_record.transaction_id
                )

                # 트랜잭션과 연관된 통계 데이터 삭제
                associated_gvrnr_stats = Gvrnr_stat_model.objects.filter(
                    transaction_id=transaction_record.transaction_id
                )

                associated_gvrnr.delete()  # 예: 트랜잭션으로 생성된 데이터 삭제
                associated_gvrnr_stats.delete()

                # 트랜잭션 상태를 'cancelled'로 변경
                transaction_record.status = "cancelled"
                transaction_record.save()

    except Exception as e:
        print(f"Failed to rollback transactions: {e}")
